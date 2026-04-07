import os
from datetime import date, datetime, timezone
from functools import lru_cache
from typing import Any, Optional

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

    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
    # Supabase tokens typically have issuer: {SUPABASE_URL}/auth/v1
    issuer = _get_env("SUPABASE_URL").rstrip("/") + "/auth/v1"
    return jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
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
    except Exception:
        return _json_error("Invalid token", status=401)
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


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")
