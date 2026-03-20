from pydantic import BaseModel


class PlaidLinkTokenResponse(BaseModel):
    link_token: str


class PlaidExchangeRequest(BaseModel):
    public_token: str
    institution_name: str = "Unknown Bank"
    account_name: str = "Checking Account"


class PlaidSyncResponse(BaseModel):
    synced: int
    message: str
