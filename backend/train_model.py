"""
Train a Random Forest model for NBFC loan risk assessment.

Features: monthly_income, cibil_score, employment_type (encoded),
          loan_amount, loan_tenure, age
Target:   0 = High Risk, 1 = Low Risk

Run:  python train_model.py
Output: risk_model.pkl
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

np.random.seed(42)
N = 5000

# ---------- synthetic data ----------

employment_types = ["salaried", "self_employed", "business", "freelancer", "retired"]

data = pd.DataFrame(
    {
        "monthly_income": np.random.lognormal(mean=10.5, sigma=0.7, size=N).astype(int),
        "cibil_score": np.random.randint(300, 900, size=N),
        "employment_type": np.random.choice(employment_types, size=N),
        "loan_amount": np.random.lognormal(mean=12.5, sigma=0.8, size=N).astype(int),
        "loan_tenure": np.random.choice([6, 12, 24, 36, 48, 60, 84, 120], size=N),
        "age": np.random.randint(21, 65, size=N),
    }
)

# Derived features
data["debt_to_income"] = data["loan_amount"] / (data["monthly_income"] * data["loan_tenure"] + 1)
data["emi_approx"] = data["loan_amount"] / data["loan_tenure"]
data["emi_to_income"] = data["emi_approx"] / (data["monthly_income"] + 1)

# Risk label logic (realistic heuristic)
score = np.zeros(N)
score += (data["cibil_score"] >= 700).astype(float) * 2.0
score += (data["cibil_score"] >= 500).astype(float) * 1.0
score += (data["monthly_income"] > 30000).astype(float) * 1.5
score += (data["monthly_income"] > 60000).astype(float) * 1.0
score += (data["emi_to_income"] < 0.5).astype(float) * 2.0
score += (data["age"] >= 25).astype(float) * 0.5
score += (data["age"] <= 55).astype(float) * 0.5
score += (data["employment_type"].isin(["salaried", "business"])).astype(float) * 1.0
score += np.random.normal(0, 0.8, N)  # noise

# Threshold → binary label
data["risk_label"] = (score >= 5.0).astype(int)  # 1=Low Risk, 0=High Risk

print(f"Dataset shape: {data.shape}")
print(f"Risk distribution:\n{data['risk_label'].value_counts()}")

# ---------- encode & split ----------

emp_map = {v: i for i, v in enumerate(employment_types)}
data["employment_type_enc"] = data["employment_type"].map(emp_map)

feature_cols = [
    "monthly_income",
    "cibil_score",
    "employment_type_enc",
    "loan_amount",
    "loan_tenure",
    "age",
    "debt_to_income",
    "emi_to_income",
]

X = data[feature_cols]
y = data["risk_label"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ---------- train ----------

clf = RandomForestClassifier(n_estimators=150, max_depth=12, random_state=42, n_jobs=-1)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
print(f"\nAccuracy: {accuracy_score(y_test, y_pred):.4f}")
print(classification_report(y_test, y_pred, target_names=["High Risk", "Low Risk"]))

# ---------- export ----------

model_bundle = {
    "model": clf,
    "feature_cols": feature_cols,
    "employment_map": emp_map,
}

joblib.dump(model_bundle, "risk_model.pkl")
print("✓ Model saved → risk_model.pkl")
