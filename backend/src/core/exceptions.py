from fastapi import HTTPException, status

class EntityNotFound(HTTPException):
    def __init__(self, detail: str = "Entity not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class InvalidOperation(HTTPException):
    def __init__(self, detail: str = "Invalid operation"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

class AccessDenied(HTTPException):
    def __init__(self, detail: str = "Access denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

class NotAuthenticated(HTTPException):
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)
