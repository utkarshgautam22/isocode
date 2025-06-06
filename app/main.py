from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import docker

from app.api.auth import router as auth_router
from app.api.problems import router as problems_router
from app.api.seed import router as seed_router

def create_app() -> FastAPI:
    """
    Factory function to create and configure the FastAPI application
    """
    app = FastAPI(
        title="IsoCode",
        description="A competitive programming platform",
        version="1.0.0",
    )
    
    # Setup Docker client
    client = docker.from_env()
    app.state.docker_client = client
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # For development only; restrict in production
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Accept", "Authorization", "Origin", "X-Requested-With"],
        expose_headers=["Content-Length"],
        max_age=600,
    )
    
    # Mount static files and set up templates
    app.mount("/static", StaticFiles(directory="app/static"), name="static")
    app.templates = Jinja2Templates(directory="app/templates")
    
    # Include the routers
    app.include_router(auth_router)
    app.include_router(problems_router)
    app.include_router(seed_router)
    
    # Root endpoints
    @app.get("/", response_class=HTMLResponse)
    async def root(request: Request):
        return app.templates.TemplateResponse("login.html", {"request": request})

    @app.get("/login", response_class=HTMLResponse)
    async def login(request: Request):
        return app.templates.TemplateResponse("login.html", {"request": request})

    @app.get("/dashboard", response_class=HTMLResponse)
    async def dashboard(request: Request):
        return app.templates.TemplateResponse("dashboard.html", {"request": request})
    
    @app.get("/register", response_class=HTMLResponse)
    async def register(request: Request):
        return app.templates.TemplateResponse("register.html", {"request": request})


    @app.get("/problem", response_class=HTMLResponse)
    async def problems(request: Request):
        return app.templates.TemplateResponse("problem.html", {"request": request})
    
    @app.get("/problemsDashboard", response_class=HTMLResponse)
    async def problems_dashboard(request: Request):
        return app.templates.TemplateResponse("problemsDashboard.html", {"request": request})  
    
    @app.get("/forgotpassword", response_class=HTMLResponse)
    async def forgot_password(request: Request):
        return app.templates.TemplateResponse("forgotPassword.html", {"request": request})

    
    
    return app

app = create_app()
