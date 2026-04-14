import io
import os
import tempfile
from datetime import date, datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import jwt
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator
import requests
from supabase import Client, create_client


load_dotenv()


def _get_env(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


def get_supabase() -> Client:
    url = _get_env("SUPABASE_URL")
    key = _get_env("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)


app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=False,
    allow_headers=["Content-Type", "Authorization"],
)


@lru_cache(maxsize=1)
def _jwks() -> dict[str, Any]:
    # Supabase exposes JWKS at: {SUPABASE_URL}/auth/v1/.well-known/jwks.json
    url = _get_env("SUPABASE_URL").rstrip("/") + "/auth/v1/.well-known/jwks.json"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()


def _verify_bearer_token() -> dict[str, Any]:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise PermissionError("Missing bearer token")
    token = auth.removeprefix("Bearer ").strip()
    if not token:
        raise PermissionError("Missing bearer token")

    jwks = _jwks()
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    if not kid:
        raise PermissionError("Invalid token header")

    keys = {k.get("kid"): k for k in jwks.get("keys", [])}
    jwk = keys.get(kid)
    if not jwk:
        # JWKS rotates; clear cache once and retry
        _jwks.cache_clear()
        jwks = _jwks()
        keys = {k.get("kid"): k for k in jwks.get("keys", [])}
        jwk = keys.get(kid)
        if not jwk:
            raise PermissionError("Unknown signing key")

    public_key = jwt.PyJWK(jwk).key
    # Supabase tokens typically have issuer: {SUPABASE_URL}/auth/v1
    issuer = _get_env("SUPABASE_URL").rstrip("/") + "/auth/v1"
    alg = jwk.get("alg", "ES256")
    return jwt.decode(
        token,
        public_key,
        algorithms=[alg, "RS256", "ES256"],
        options={"verify_aud": False},
        issuer=issuer,
    )


@app.before_request
def _require_auth_for_api():
    if not request.path.startswith("/api/"):
        return None
    if request.path == "/api/health":
        return None
    if request.method == "OPTIONS":
        return None
    try:
        _verify_bearer_token()
    except PermissionError as e:
        return _json_error(str(e), status=401)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return _json_error(f"Invalid token: {str(e)}", status=401)
    return None


class LeadIn(BaseModel):
    lead_id: str = Field(min_length=1, max_length=50)
    lead_name: str = Field(min_length=1, max_length=100)
    lead_age: int = Field(ge=0)
    lead_dob: date
    lead_ph_no: str = Field(min_length=6, max_length=15)
    lead_branch: str = Field(min_length=1, max_length=100)
    lead_la: str = Field(min_length=1, max_length=50)
    lead_loan_amt: float = Field(ge=0)
    lead_roi: float = Field(ge=0)
    lead_tenure: int = Field(ge=0)
    lead_product: str = Field(min_length=1, max_length=50)
    gender: str = Field(min_length=1, max_length=10)
    lead_address: str = Field(min_length=1, max_length=255)
    lead_emailid: EmailStr
    lead_source: str = Field(min_length=1, max_length=50)
    monthly_income: float = Field(ge=0)
    cibil_score: int = Field(ge=0)
    employment_type: str = Field(min_length=1, max_length=50)
    secondary_lead_ph_no: Optional[str] = Field(default=None, max_length=15)
    secondary_lead_emailid: Optional[EmailStr] = None
    identity_proof_submitted: bool
    lead_category: str = Field(min_length=1, max_length=20)
    region: str = Field(min_length=1, max_length=20)

    @field_validator("gender")
    @classmethod
    def _gender_trim(cls, v: str) -> str:
        return v.strip()


class LeadPatch(BaseModel):
    lead_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    lead_age: Optional[int] = Field(default=None, ge=0)
    lead_dob: Optional[date] = None
    lead_ph_no: Optional[str] = Field(default=None, min_length=6, max_length=15)
    lead_branch: Optional[str] = Field(default=None, min_length=1, max_length=100)
    lead_la: Optional[str] = Field(default=None, min_length=1, max_length=50)
    lead_loan_amt: Optional[float] = Field(default=None, ge=0)
    lead_roi: Optional[float] = Field(default=None, ge=0)
    lead_tenure: Optional[int] = Field(default=None, ge=0)
    lead_product: Optional[str] = Field(default=None, min_length=1, max_length=50)
    gender: Optional[str] = Field(default=None, min_length=1, max_length=10)
    lead_address: Optional[str] = Field(default=None, min_length=1, max_length=255)
    lead_emailid: Optional[EmailStr] = None
    lead_source: Optional[str] = Field(default=None, min_length=1, max_length=50)
    monthly_income: Optional[float] = Field(default=None, ge=0)
    cibil_score: Optional[int] = Field(default=None, ge=0)
    employment_type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    secondary_lead_ph_no: Optional[str] = Field(default=None, max_length=15)
    secondary_lead_emailid: Optional[EmailStr] = None
    identity_proof_submitted: Optional[bool] = None
    lead_category: Optional[str] = Field(default=None, min_length=1, max_length=20)
    region: Optional[str] = Field(default=None, min_length=1, max_length=20)


class ApplicantIn(BaseModel):
    lead_id: Optional[str] = Field(default=None, max_length=50)
    salutation: str = Field(min_length=1, max_length=10)
    applicant_fname: str = Field(min_length=1, max_length=50)
    applicant_mname: Optional[str] = Field(default=None, max_length=50)
    applicant_lname: str = Field(min_length=1, max_length=50)
    gender: str = Field(min_length=1, max_length=10)
    age: int = Field(ge=0)
    prim_contact_number: str = Field(min_length=6, max_length=15)
    sec_contact_number: Optional[str] = Field(default=None, max_length=15)
    prim_emailid: EmailStr
    sec_emailid: Optional[EmailStr] = None
    dob: date
    marital_status: str = Field(min_length=1, max_length=20)
    social_category: str = Field(min_length=1, max_length=20)
    education_qualification: str = Field(min_length=1, max_length=50)
    nationality: str = Field(min_length=1, max_length=50)
    religion: Optional[str] = Field(default=None, max_length=50)
    kyc_ref_no: str = Field(min_length=1, max_length=50)
    relation_with_applicant: Optional[str] = Field(default=None, max_length=50)
    app_type: str = Field(min_length=1, max_length=20)
    monthly_income: Optional[float] = Field(default=None, ge=0)
    citizenship: Optional[str] = Field(default=None, max_length=50)
    residential_status: Optional[str] = Field(default=None, max_length=50)


class ApplicationIn(BaseModel):
    loan_id: Optional[int] = None
    applicant_id: Optional[int] = None
    product: str = Field(min_length=1, max_length=50)
    branch_id: str = Field(min_length=1, max_length=50)
    loan_amount: float = Field(ge=0)
    loan_roi: float = Field(ge=0)
    loan_tenure: int = Field(ge=0)
    servicing_la: str = Field(min_length=1, max_length=50)
    application_date: datetime
    app_processing_duration: int = Field(ge=0)
    app_status: str = Field(min_length=1, max_length=50)
    loan_type: str = Field(min_length=1, max_length=50)
    channel: str = Field(min_length=1, max_length=50)


def _json_error(message: str, *, status: int = 400, details: Any = None):
    payload: dict[str, Any] = {"error": message}
    if details is not None:
        payload["details"] = details
    return jsonify(payload), status


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/leads")
def list_leads():
    sb = get_supabase()
    q = request.args.get("q", "").strip()
    limit = int(request.args.get("limit", "50"))
    limit = max(1, min(limit, 200))

    query = sb.table("lead").select("*").order("lead_date", desc=True).limit(limit)
    if q:
        # basic search by name/phone/lead_id/email
        query = query.or_(
            f"lead_name.ilike.%{q}%,lead_ph_no.ilike.%{q}%,lead_id.ilike.%{q}%,lead_emailid.ilike.%{q}%"
        )
    res = query.execute()
    return jsonify(res.data or [])


@app.post("/api/leads")
def create_lead():
    try:
        payload = LeadIn.model_validate(request.get_json(force=True))
    except ValidationError as e:
        return _json_error("Invalid payload", details=e.errors())

    sb = get_supabase()
    res = sb.table("lead").insert(payload.model_dump(mode="json")).execute()
    if res.data:
        return jsonify(res.data[0]), 201
    return _json_error("Insert failed", status=500)


@app.get("/api/leads/<lead_id>")
def get_lead(lead_id: str):
    sb = get_supabase()
    res = sb.table("lead").select("*").eq("lead_id", lead_id).maybe_single().execute()
    if not res.data:
        return _json_error("Lead not found", status=404)
    return jsonify(res.data)


@app.patch("/api/leads/<lead_id>")
def patch_lead(lead_id: str):
    try:
        patch = LeadPatch.model_validate(request.get_json(force=True))
    except ValidationError as e:
        return _json_error("Invalid payload", details=e.errors())

    updates = {
        k: v for k, v in patch.model_dump(mode="json").items() if v is not None
    }
    if not updates:
        return _json_error("No fields to update")

    sb = get_supabase()
    res = (
        sb.table("lead")
        .update({**updates, "lead_updated_at": datetime.now(timezone.utc).isoformat()})
        .eq("lead_id", lead_id)
        .execute()
    )
    if res.data:
        return jsonify(res.data[0])
    return _json_error("Lead not found", status=404)


@app.delete("/api/leads/<lead_id>")
def delete_lead(lead_id: str):
    sb = get_supabase()
    res = sb.table("lead").delete().eq("lead_id", lead_id).execute()
    if res.data:
        return jsonify({"deleted": True})
    return _json_error("Lead not found", status=404)


@app.get("/api/leads/<lead_id>/applicants")
def list_applicants_for_lead(lead_id: str):
    sb = get_supabase()
    res = sb.table("applicant").select("*").eq("lead_id", lead_id).execute()
    return jsonify(res.data or [])


@app.get("/api/applicants")
def list_applicants():
    sb = get_supabase()
    limit = int(request.args.get("limit", "50"))
    limit = max(1, min(limit, 200))
    res = sb.table("applicant").select("*").order("app_date_time", desc=True).limit(limit).execute()
    return jsonify(res.data or [])


@app.post("/api/applicants")
def create_applicant():
    try:
        payload = ApplicantIn.model_validate(request.get_json(force=True))
    except ValidationError as e:
        return _json_error("Invalid payload", details=e.errors())
    sb = get_supabase()
    res = sb.table("applicant").insert(payload.model_dump(mode="json")).execute()
    if res.data:
        return jsonify(res.data[0]), 201
    return _json_error("Insert failed", status=500)


@app.get("/api/applicants/<int:applicant_id>")
def get_applicant(applicant_id: int):
    sb = get_supabase()
    res = sb.table("applicant").select("*").eq("applicant_id", applicant_id).maybe_single().execute()
    if not res.data:
        return _json_error("Applicant not found", status=404)
    return jsonify(res.data)


@app.get("/api/applications")
def list_applications():
    sb = get_supabase()
    limit = int(request.args.get("limit", "50"))
    limit = max(1, min(limit, 200))
    res = sb.table("application").select("*").order("application_date", desc=True).limit(limit).execute()
    return jsonify(res.data or [])


@app.post("/api/applications")
def create_application():
    try:
        payload = ApplicationIn.model_validate(request.get_json(force=True))
    except ValidationError as e:
        return _json_error("Invalid payload", details=e.errors())
    sb = get_supabase()
    res = sb.table("application").insert(payload.model_dump(mode="json")).execute()
    if res.data:
        return jsonify(res.data[0]), 201
    return _json_error("Insert failed", status=500)


@app.get("/api/applications/<int:application_id>")
def get_application(application_id: int):
    sb = get_supabase()
    res = sb.table("application").select("*").eq("application_id", application_id).maybe_single().execute()
    if not res.data:
        return _json_error("Application not found", status=404)
    return jsonify(res.data)


# --------------- Risk Assessment ---------------

_MODEL_PATH = Path(__file__).parent / "risk_model.pkl"


@lru_cache(maxsize=1)
def _load_model():
    if not _MODEL_PATH.exists():
        raise RuntimeError("risk_model.pkl not found – run train_model.py first")
    return joblib.load(_MODEL_PATH)


def _predict_risk(data: dict[str, Any]) -> dict[str, Any]:
    bundle = _load_model()
    clf = bundle["model"]
    emp_map: dict[str, int] = bundle["employment_map"]
    feature_cols: list[str] = bundle["feature_cols"]

    monthly_income = float(data.get("monthly_income", 0))
    loan_amount = float(data.get("loan_amount", 0))
    loan_tenure = int(data.get("loan_tenure", 1) or 1)
    cibil_score = int(data.get("cibil_score", 0))
    age = int(data.get("age", 0))
    emp_type = str(data.get("employment_type", "salaried")).lower().strip()
    emp_enc = emp_map.get(emp_type, 0)

    emi_approx = loan_amount / max(loan_tenure, 1)
    emi_to_income = emi_approx / max(monthly_income, 1)
    debt_to_income = loan_amount / max(monthly_income * loan_tenure, 1)

    row = {
        "monthly_income": monthly_income,
        "cibil_score": cibil_score,
        "employment_type_enc": emp_enc,
        "loan_amount": loan_amount,
        "loan_tenure": loan_tenure,
        "age": age,
        "debt_to_income": debt_to_income,
        "emi_to_income": emi_to_income,
    }
    X = np.array([[row[c] for c in feature_cols]])
    proba = clf.predict_proba(X)[0]  # [P(high), P(low)]
    pred = int(clf.predict(X)[0])
    risk_score = round(float(proba[1]), 4)  # probability of Low Risk
    risk_label = "Low Risk" if pred == 1 else "High Risk"
    return {"risk_score": risk_score, "risk_label": risk_label}


@app.post("/api/risk-assess")
def risk_assess():
    """Standalone risk assessment – pass applicant financials, get risk score."""
    body = request.get_json(force=True)
    try:
        result = _predict_risk(body)
    except Exception as e:
        return _json_error(str(e), status=500)
    return jsonify(result)


@app.post("/api/applications/<int:application_id>/assess")
def assess_application(application_id: int):
    """Run risk model on an existing application and save the score."""
    sb = get_supabase()
    app_res = (
        sb.table("application")
        .select("*")
        .eq("application_id", application_id)
        .maybe_single()
        .execute()
    )
    if not app_res.data:
        return _json_error("Application not found", status=404)
    app_row = app_res.data

    # Try to get linked applicant for age/income
    applicant_data: dict[str, Any] = {}
    if app_row.get("applicant_id"):
        ap_res = (
            sb.table("applicant")
            .select("*")
            .eq("applicant_id", app_row["applicant_id"])
            .maybe_single()
            .execute()
        )
        if ap_res.data:
            applicant_data = ap_res.data

    risk_input = {
        "monthly_income": applicant_data.get("monthly_income") or app_row.get("loan_amount", 0) / 20,
        "cibil_score": applicant_data.get("cibil_score", 600),
        "employment_type": applicant_data.get("employment_type", "salaried"),
        "loan_amount": app_row.get("loan_amount", 0),
        "loan_tenure": app_row.get("loan_tenure", 12),
        "age": applicant_data.get("age", 30),
    }
    result = _predict_risk(risk_input)

    sb.table("application").update(
        {
            "risk_score": result["risk_score"],
            "risk_label": result["risk_label"],
        }
    ).eq("application_id", application_id).execute()

    return jsonify({**result, "application_id": application_id})


# --------------- Application Status ---------------


@app.patch("/api/applications/<int:application_id>/status")
def update_application_status(application_id: int):
    body = request.get_json(force=True)
    new_status = body.get("app_status")
    if not new_status:
        return _json_error("app_status is required")

    sb = get_supabase()

    # Disbursements go through the stored procedure — it validates status,
    # risk label, amount ceiling, computes EMI, and writes disbursement_log
    # atomically. All other status transitions use the normal update path.
    if new_status == "Disbursed":
        disburse_amount = body.get("disburse_amount")
        if not disburse_amount:
            # Fall back to the sanctioned loan_amount if not explicitly provided
            app_res = (
                sb.table("application")
                .select("loan_amount")
                .eq("application_id", application_id)
                .maybe_single()
                .execute()
            )
            if not app_res.data:
                return _json_error("Application not found", status=404)
            disburse_amount = app_res.data["loan_amount"]

        actor = body.get("actor", "system")
        try:
            sb.rpc(
                "sp_approve_and_disburse",
                {
                    "p_application_id": application_id,
                    "p_disburse_amount": float(disburse_amount),
                    "p_actor": actor,
                },
            ).execute()
        except Exception as e:
            # Supabase surfaces RAISE EXCEPTION messages in the error detail
            return _json_error(str(e), status=422)

        # Fetch and return the updated row so the response shape stays the same
        updated = (
            sb.table("application")
            .select("*")
            .eq("application_id", application_id)
            .maybe_single()
            .execute()
        )
        return jsonify(updated.data)

    # ── Normal status transition (e.g. Under Review → Approved / Rejected) ──
    res = (
        sb.table("application")
        .update({"app_status": new_status})
        .eq("application_id", application_id)
        .execute()
    )
    if res.data:
        return jsonify(res.data[0])
    return _json_error("Application not found", status=404)


# --------------- Documents & OCR ---------------


@app.post("/api/documents/upload")
def upload_document():
    """Upload a PDF, extract text with pdfplumber, store metadata."""
    import pdfplumber

    file = request.files.get("file")
    if not file:
        return _json_error("No file provided")

    application_id = request.form.get("application_id")
    applicant_id = request.form.get("applicant_id")
    doc_type = request.form.get("doc_type", "other")

    if not application_id:
        return _json_error("application_id is required")

    # Save temp file and extract text
    ocr_text = ""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        file.save(tmp)
        tmp_path = tmp.name

    try:
        with pdfplumber.open(tmp_path) as pdf:
            pages_text = []
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
            ocr_text = "\n\n".join(pages_text)
    except Exception:
        ocr_text = "[Could not extract text]"
    finally:
        os.unlink(tmp_path)

    # For now store file_url as a placeholder – real impl would upload to Supabase Storage
    file_url = f"/uploads/{file.filename}"

    sb = get_supabase()
    doc_data = {
        "application_id": int(application_id),
        "doc_type": doc_type,
        "file_url": file_url,
        "ocr_text": ocr_text[:10000],  # cap length
        "ocr_verified": bool(ocr_text and ocr_text != "[Could not extract text]"),
    }
    if applicant_id:
        doc_data["applicant_id"] = int(applicant_id)

    res = sb.table("document").insert(doc_data).execute()
    if res.data:
        return jsonify(res.data[0]), 201
    return _json_error("Insert failed", status=500)


@app.get("/api/documents/<int:application_id>")
def list_documents(application_id: int):
    sb = get_supabase()
    res = (
        sb.table("document")
        .select("*")
        .eq("application_id", application_id)
        .order("uploaded_at", desc=True)
        .execute()
    )
    return jsonify(res.data or [])


# --------------- Dashboard Stats ---------------


@app.get("/api/stats")
def dashboard_stats():
    """Single aggregated query via fn_get_portfolio_summary() — no Python-side counting."""
    sb = get_supabase()
    try:
        res = sb.rpc("fn_get_portfolio_summary", {}).execute()
    except Exception as e:
        return _json_error(f"Stats query failed: {e}", status=500)

    row = (res.data or [{}])[0]
    return jsonify(
        {
            "total_leads":         int(row.get("total_leads", 0)),
            "total_applications":  int(row.get("total_applications", 0)),
            "pending_assessment":  int(row.get("pending_assessment", 0)),
            "approved":            int(row.get("approved", 0)),
            "rejected":            int(row.get("rejected", 0)),
            "disbursed":           int(row.get("disbursed", 0)),
            "low_risk":            int(row.get("low_risk", 0)),
            "high_risk":           int(row.get("high_risk", 0)),
            "total_loan_value":    float(row.get("total_loan_value", 0)),
            "avg_loan_amount":     float(row.get("avg_loan_amount", 0)),
            "avg_risk_score":      float(row.get("avg_risk_score", 0)),
        }
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")
