from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class ProgrammingExperience(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate" 
    ADVANCED = "advanced"

class Department(str, Enum):
    CSE = "cse"
    IT = "it"
    ECE = "ece"
    EEE = "eee"
    MECH = "mech"
    CIVIL = "civil"
    OTHER = "other"

class Year(str, Enum):
    FIRST = "1"
    SECOND = "2"
    THIRD = "3"
    FOURTH = "4"
    OTHER = "other"

class UserBase(BaseModel):
    username: str
    email: EmailStr
    password:str
    
class UserRegistration(UserBase):
    firstName: str
    lastName: str
    college: str
    year: Year
    department: Department
    programmingExperience: ProgrammingExperience
    agreeNewsletter: bool = False
    
class UserLogin(BaseModel):
    email: str
    password: str
    rememberMe: bool = False
    
class UserProfile(UserBase):
    id: int
    firstName: str
    lastName: str
    college: str
    year: Year
    department: Department
    programmingExperience: ProgrammingExperience
    is_admin: bool = False
    is_email_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
