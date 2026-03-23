import numpy as np
import torch
import torch.nn as nn
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


# ─── Baseline ────────────────────────────────────────────────────────────────

def build_baseline() -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    LogisticRegression(max_iter=1000, random_state=42)),
    ])


# backwards-compat alias used by src/backtest.py
build_model = build_baseline


# ─── LSTM ─────────────────────────────────────────────────────────────────────

class LSTMClassifier(nn.Module):
    def __init__(self, input_size: int, hidden_size: int = 64, dropout: float = 0.2):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.drop = nn.Dropout(dropout)
        self.fc   = nn.Linear(hidden_size, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        _, (h, _) = self.lstm(x)        # h: (1, batch, hidden)
        out = self.drop(h.squeeze(0))   # (batch, hidden)
        return self.fc(out).squeeze(-1) # (batch,) — raw logits


def get_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def make_sequences(X: np.ndarray, y: np.ndarray, seq_len: int):
    """
    Rolls a window of seq_len over X.
    Sequence i: X[i : i+seq_len], label: y[i+seq_len-1].
    No lookahead — label is the last timestep in the window.
    """
    n_seq = len(X) - seq_len + 1
    X_seq = np.stack([X[i : i + seq_len] for i in range(n_seq)])
    y_seq = y[seq_len - 1:]
    return X_seq, y_seq


def train_lstm(
    model: "LSTMClassifier",
    X_seq: np.ndarray,
    y_seq: np.ndarray,
    device: torch.device,
    epochs: int = 20,
    batch_size: int = 64,
    lr: float = 1e-3,
) -> "LSTMClassifier":
    model.to(device)
    model.train()
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    X_t = torch.tensor(X_seq, dtype=torch.float32)
    y_t = torch.tensor(y_seq, dtype=torch.float32)
    n   = len(X_t)

    for epoch in range(1, epochs + 1):
        perm = torch.randperm(n)
        X_t, y_t = X_t[perm], y_t[perm]
        epoch_loss = 0.0
        for start in range(0, n, batch_size):
            xb = X_t[start : start + batch_size].to(device)
            yb = y_t[start : start + batch_size].to(device)
            optimizer.zero_grad()
            loss = criterion(model(xb), yb)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * len(xb)
        print(f"  Epoch {epoch:02d}/{epochs}  loss={epoch_loss / n:.4f}")

    model.eval()
    return model


def eval_lstm(
    model: "LSTMClassifier",
    X_seq: np.ndarray,
    device: torch.device,
    batch_size: int = 256,
):
    model.eval()
    X_t   = torch.tensor(X_seq, dtype=torch.float32)
    probs = []
    with torch.no_grad():
        for start in range(0, len(X_t), batch_size):
            xb = X_t[start : start + batch_size].to(device)
            p  = torch.sigmoid(model(xb)).cpu().numpy()
            probs.append(p)
    y_prob = np.concatenate(probs)
    y_pred = (y_prob >= 0.5).astype(int)
    return y_pred, y_prob
