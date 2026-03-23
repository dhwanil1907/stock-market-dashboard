import json
import pickle
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    f1_score, precision_score, recall_score,
)
from sklearn.preprocessing import StandardScaler

from src.model import (
    LSTMClassifier, build_baseline,
    eval_lstm, get_device, make_sequences, train_lstm,
)

FEATURE_COLS = [
    "ret_1d", "ret_5d", "ret_20d",
    "vol_20d", "vol_60d",
    "sma20_gap", "sma60_gap",
    "rsi_14",
    "macd", "macd_signal", "macd_hist",
    "volume_z_20d",
]

SEQ_LEN     = 30
LSTM_EPOCHS = 20
INPUT_PATH  = Path("data/processed/dataset.csv")
OUTPUT_DIR  = Path("outputs/results")
MODEL_DIR   = Path("outputs/models")


# ─── Shared helpers ───────────────────────────────────────────────────────────

def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["date"])
    return df.sort_values("date").reset_index(drop=True)


def time_split(df: pd.DataFrame, train_frac: float = 0.8):
    split = int(len(df) * train_frac)
    return df.iloc[:split].copy(), df.iloc[split:].copy()


def save_metrics(metrics: dict, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(metrics, f, indent=2)


def save_predictions(dates, y_true, y_pred, y_prob, path: Path):
    pd.DataFrame({
        "date":   pd.Series(dates).values,
        "y_true": y_true,
        "y_pred": y_pred,
        "y_prob": y_prob,
    }).to_csv(path, index=False)


def save_confusion_matrix(y_true, y_pred, title: str, path: Path):
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(5, 4))
    im = ax.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.colorbar(im, ax=ax)
    ax.set(
        xticks=[0, 1], yticks=[0, 1],
        xticklabels=["Pred 0", "Pred 1"],
        yticklabels=["True 0", "True 1"],
        title=title, xlabel="Predicted", ylabel="Actual",
    )
    for i in range(2):
        for j in range(2):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "black",
                    fontsize=14)
    plt.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def build_metrics(y_true, y_pred, train_df, test_df) -> dict:
    return {
        "accuracy":    round(accuracy_score(y_true, y_pred), 4),
        "precision":   round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall":      round(recall_score(y_true, y_pred, zero_division=0), 4),
        "f1":          round(f1_score(y_true, y_pred, zero_division=0), 4),
        "train_size":  len(train_df),
        "test_size":   len(test_df),
        "train_start": str(train_df["date"].min().date()),
        "train_end":   str(train_df["date"].max().date()),
        "test_start":  str(test_df["date"].min().date()),
        "test_end":    str(test_df["date"].max().date()),
    }


# ─── Baseline ─────────────────────────────────────────────────────────────────

def run_baseline(train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    print("\n── Baseline (Logistic Regression) ──")
    X_train = train_df[FEATURE_COLS].values
    y_train = train_df["y"].values
    X_test  = test_df[FEATURE_COLS].values
    y_test  = test_df["y"].values

    model = build_baseline()
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print(classification_report(y_test, y_pred, zero_division=0))

    m = build_metrics(y_test, y_pred, train_df, test_df)
    save_metrics(m, OUTPUT_DIR / "metrics_baseline.json")
    save_predictions(test_df["date"], y_test, y_pred, y_prob,
                     OUTPUT_DIR / "predictions_baseline.csv")
    save_confusion_matrix(y_test, y_pred,
                          "Confusion Matrix — Logistic Regression",
                          OUTPUT_DIR / "confusion_matrix_baseline.png")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(MODEL_DIR / "baseline.pkl", "wb") as f:
        pickle.dump(model, f)

    print(f"  Acc={m['accuracy']}  Prec={m['precision']}  Rec={m['recall']}  F1={m['f1']}")
    return m


# ─── LSTM ─────────────────────────────────────────────────────────────────────

def run_lstm(train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    print("\n── LSTM ──")
    device = get_device()
    print(f"  Device: {device}")

    # scale on train stats only
    scaler      = StandardScaler()
    X_train_raw = scaler.fit_transform(train_df[FEATURE_COLS].values)
    X_test_raw  = scaler.transform(test_df[FEATURE_COLS].values)

    X_train_seq, y_train_seq = make_sequences(X_train_raw, train_df["y"].values, SEQ_LEN)
    X_test_seq,  y_test_seq  = make_sequences(X_test_raw,  test_df["y"].values,  SEQ_LEN)

    model = LSTMClassifier(input_size=len(FEATURE_COLS))
    model = train_lstm(model, X_train_seq, y_train_seq, device, epochs=LSTM_EPOCHS)

    y_pred, y_prob = eval_lstm(model, X_test_seq, device)

    # dates/rows align to the last timestep of each sequence
    test_df_seq = test_df.iloc[SEQ_LEN - 1:].reset_index(drop=True)

    print(classification_report(y_test_seq, y_pred, zero_division=0))

    m = build_metrics(y_test_seq, y_pred, train_df, test_df_seq)
    save_metrics(m, OUTPUT_DIR / "metrics_lstm.json")
    save_predictions(test_df_seq["date"], y_test_seq, y_pred, y_prob,
                     OUTPUT_DIR / "predictions_lstm.csv")
    save_confusion_matrix(y_test_seq, y_pred,
                          "Confusion Matrix — LSTM",
                          OUTPUT_DIR / "confusion_matrix_lstm.png")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), MODEL_DIR / "lstm.pt")

    print(f"  Acc={m['accuracy']}  Prec={m['precision']}  Rec={m['recall']}  F1={m['f1']}")
    return m


# ─── Walk-forward (baseline) ──────────────────────────────────────────────────

def run_walkforward(df: pd.DataFrame, n_folds: int = 3):
    print("\n── Walk-Forward Evaluation (Baseline, 3 folds) ──")
    MIN_TRAIN = 60
    chunk = len(df) // (n_folds + 1)

    if chunk < MIN_TRAIN:
        print(f"  WARNING: dataset too small for {n_folds}-fold walk-forward "
              f"(chunk={chunk} < {MIN_TRAIN}). Skipping.")
        return

    rows = []
    for fold in range(n_folds):
        train_end = (fold + 1) * chunk
        fold_train = df.iloc[:train_end]
        fold_test  = df.iloc[train_end : train_end + chunk]

        m = build_baseline()
        m.fit(fold_train[FEATURE_COLS].values, fold_train["y"].values)
        y_pred = m.predict(fold_test[FEATURE_COLS].values)
        y_te   = fold_test["y"].values

        row = {
            "fold":        fold + 1,
            "train_start": str(fold_train["date"].min().date()),
            "train_end":   str(fold_train["date"].max().date()),
            "test_start":  str(fold_test["date"].min().date()),
            "test_end":    str(fold_test["date"].max().date()),
            "train_rows":  len(fold_train),
            "test_rows":   len(fold_test),
            "accuracy":    round(accuracy_score(y_te, y_pred), 4),
            "precision":   round(precision_score(y_te, y_pred, zero_division=0), 4),
            "recall":      round(recall_score(y_te, y_pred, zero_division=0), 4),
            "f1":          round(f1_score(y_te, y_pred, zero_division=0), 4),
        }
        rows.append(row)
        print(f"  Fold {fold+1}: acc={row['accuracy']}  prec={row['precision']}  "
              f"rec={row['recall']}  f1={row['f1']}  "
              f"| test {row['test_start']} → {row['test_end']}")

    pd.DataFrame(rows).to_csv(OUTPUT_DIR / "walkforward_metrics.csv", index=False)
    print(f"  Saved → {OUTPUT_DIR}/walkforward_metrics.csv")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    df = load_data(INPUT_PATH)
    train_df, test_df = time_split(df)

    print(f"Train: {train_df['date'].min().date()} → {train_df['date'].max().date()}  ({len(train_df)} rows)")
    print(f"Test:  {test_df['date'].min().date()} → {test_df['date'].max().date()}  ({len(test_df)} rows)")

    baseline_m = run_baseline(train_df, test_df)
    lstm_m     = run_lstm(train_df, test_df)
    run_walkforward(df)

    print("\n── Final Comparison ──")
    print(f"{'Model':<12} {'Accuracy':>10} {'Precision':>10} {'Recall':>10} {'F1':>10}")
    print("─" * 54)
    for name, m in [("Baseline", baseline_m), ("LSTM", lstm_m)]:
        print(f"{name:<12} {m['accuracy']:>10} {m['precision']:>10} {m['recall']:>10} {m['f1']:>10}")

    print(f"\nOutputs → {OUTPUT_DIR}/   Models → {MODEL_DIR}/")


if __name__ == "__main__":
    main()
