#!/usr/bin/env python3
import asyncio
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Dict, Optional, Union
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import time
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class EmailMessage:
    """Email message data structure"""
    to_email: str
    subject: str
    body: str
    html_body: Optional[str] = None
    from_name: Optional[str] = None
    attachments: Optional[List[str]] = None
    priority: str = "normal"  # high, normal, low

@dataclass
class EmailConfig:
    """Email configuration"""
    smtp_server: str
    smtp_port: int
    username: str
    password: str
    use_tls: bool = True
    timeout: int = 10
    max_connections: int = 5

class ConnectionPool:
    """SMTP Connection pool for reusing connections"""
    
    def __init__(self, config: EmailConfig, pool_size: int = 5):
        self.config = config
        self.pool_size = pool_size
        self.connections = []
        self.lock = asyncio.Lock()
        
    async def get_connection(self):
        """Get an SMTP connection from the pool"""
        async with self.lock:
            if self.connections:
                return self.connections.pop()
            
            # Create new connection if pool is empty
            return await self._create_connection()
    
    async def return_connection(self, connection):
        """Return connection to the pool"""
        async with self.lock:
            if len(self.connections) < self.pool_size:
                self.connections.append(connection)
            else:
                # Pool is full, close the connection
                try:
                    connection.quit()
                except Exception:
                    pass
    
    async def _create_connection(self):
        """Create a new SMTP connection"""
        loop = asyncio.get_event_loop()
        
        def _create_smtp():
            if self.config.use_tls:
                context = ssl.create_default_context()
                server = smtplib.SMTP(self.config.smtp_server, self.config.smtp_port, timeout=self.config.timeout)
                server.starttls(context=context)
            else:
                server = smtplib.SMTP(self.config.smtp_server, self.config.smtp_port, timeout=self.config.timeout)
            
            server.login(self.config.username, self.config.password)
            return server
        
        return await loop.run_in_executor(None, _create_smtp)
    
    async def close_all(self):
        """Close all connections in the pool"""
        async with self.lock:
            for connection in self.connections:
                try:
                    connection.quit()
                except Exception:
                    pass
            self.connections.clear()

class FastEmailSender:
    """High-performance email sender with async operations and connection pooling"""
    
    def __init__(self, config: EmailConfig = None):
        if config is None:
            config = EmailConfig(
                smtp_server=getattr(settings, 'SMTP_SERVER', 'smtp.gmail.com'),
                smtp_port=getattr(settings, 'SMTP_PORT', 587),
                username=getattr(settings, 'SMTP_USERNAME', ''),
                password=getattr(settings, 'SMTP_PASSWORD', ''),
                use_tls=getattr(settings, 'SMTP_USE_TLS', True),
                timeout=getattr(settings, 'SMTP_TIMEOUT', 10),
                max_connections=getattr(settings, 'SMTP_MAX_CONNECTIONS', 5)
            )
        
        self.config = config
        self.pool = ConnectionPool(config, config.max_connections)
        self.executor = ThreadPoolExecutor(max_workers=config.max_connections)
        
    async def send_single_email(self, message: EmailMessage) -> Dict[str, Union[bool, str]]:
        """Send a single email"""
        start_time = time.time()
        
        try:
            # Get connection from pool
            connection = await self.pool.get_connection()
            
            # Create email message
            msg = self._create_message(message)
            
            # Send email in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                self._send_message,
                connection,
                message.to_email,
                msg.as_string()
            )
            
            # Return connection to pool
            await self.pool.return_connection(connection)
            
            end_time = time.time()
            logger.info(f"Email sent to {message.to_email} in {end_time - start_time:.2f}s")
            
            return {
                "success": True,
                "email": message.to_email,
                "time_taken": end_time - start_time,
                "message": "Email sent successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to send email to {message.to_email}: {str(e)}")
            return {
                "success": False,
                "email": message.to_email,
                "error": str(e),
                "time_taken": time.time() - start_time
            }
    
    async def send_bulk_emails(self, messages: List[EmailMessage], max_concurrent: int = None) -> List[Dict]:
        """Send multiple emails concurrently"""
        if max_concurrent is None:
            max_concurrent = self.config.max_connections
        
        start_time = time.time()
        logger.info(f"Starting bulk email send for {len(messages)} emails")
        
        # Create semaphore to limit concurrent operations
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def send_with_semaphore(message):
            async with semaphore:
                return await self.send_single_email(message)
        
        # Send all emails concurrently
        tasks = [send_with_semaphore(message) for message in messages]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        processed_results = []
        successful = 0
        failed = 0
        
        for result in results:
            if isinstance(result, Exception):
                processed_results.append({
                    "success": False,
                    "error": str(result),
                    "email": "unknown"
                })
                failed += 1
            else:
                processed_results.append(result)
                if result["success"]:
                    successful += 1
                else:
                    failed += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        logger.info(f"Bulk email completed: {successful} successful, {failed} failed in {total_time:.2f}s")
        logger.info(f"Average time per email: {total_time/len(messages):.2f}s")
        
        return {
            "total_emails": len(messages),
            "successful": successful,
            "failed": failed,
            "total_time": total_time,
            "average_time_per_email": total_time / len(messages),
            "results": processed_results
        }
    
    async def send_batch_optimized(self, messages: List[EmailMessage], batch_size: int = 50) -> List[Dict]:
        """Send emails in optimized batches for very large lists"""
        if len(messages) <= batch_size:
            return await self.send_bulk_emails(messages)
        
        logger.info(f"Processing {len(messages)} emails in batches of {batch_size}")
        
        all_results = []
        total_successful = 0
        total_failed = 0
        start_time = time.time()
        
        # Process in batches
        for i in range(0, len(messages), batch_size):
            batch = messages[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(messages) + batch_size - 1) // batch_size
            
            logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} emails)")
            
            batch_result = await self.send_bulk_emails(batch)
            all_results.extend(batch_result["results"])
            total_successful += batch_result["successful"]
            total_failed += batch_result["failed"]
            
            # Small delay between batches to avoid overwhelming the server
            if i + batch_size < len(messages):
                await asyncio.sleep(0.1)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        return {
            "total_emails": len(messages),
            "successful": total_successful,
            "failed": total_failed,
            "total_time": total_time,
            "average_time_per_email": total_time / len(messages),
            "batches_processed": (len(messages) + batch_size - 1) // batch_size,
            "results": all_results
        }
    
    def _create_message(self, email_msg: EmailMessage) -> MIMEMultipart:
        """Create MIME message from EmailMessage"""
        msg = MIMEMultipart('alternative')
        
        # Set headers
        msg['Subject'] = email_msg.subject
        msg['From'] = f"{email_msg.from_name or 'CodeMaster'} <{self.config.username}>"
        msg['To'] = email_msg.to_email
        
        # Set priority
        if email_msg.priority == "high":
            msg['X-Priority'] = '1'
            msg['X-MSMail-Priority'] = 'High'
        elif email_msg.priority == "low":
            msg['X-Priority'] = '5'
            msg['X-MSMail-Priority'] = 'Low'
        
        # Add text body
        if email_msg.body:
            text_part = MIMEText(email_msg.body, 'plain')
            msg.attach(text_part)
        
        # Add HTML body if provided
        if email_msg.html_body:
            html_part = MIMEText(email_msg.html_body, 'html')
            msg.attach(html_part)
        
        # Add attachments if provided
        if email_msg.attachments:
            for file_path in email_msg.attachments:
                if Path(file_path).exists():
                    with open(file_path, "rb") as attachment:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment.read())
                    
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {Path(file_path).name}'
                    )
                    msg.attach(part)
        
        return msg
    
    def _send_message(self, connection, to_email: str, message: str):
        """Send message using SMTP connection (blocking operation)"""
        connection.sendmail(self.config.username, to_email, message)
    
    async def close(self):
        """Close the email sender and cleanup resources"""
        await self.pool.close_all()
        self.executor.shutdown(wait=True)

# Convenience functions for common use cases
async def send_welcome_email(email: str, username: str) -> Dict:
    """Send welcome email to new user"""
    sender = FastEmailSender()
    
    message = EmailMessage(
        to_email=email,
        subject="Welcome to CodeMaster!",
        body=f"Hello {username},\n\nWelcome to CodeMaster! Start your coding journey today.\n\nBest regards,\nCodeMaster Team",
        html_body=f"""
        <html>
            <body>
                <h2>Welcome to CodeMaster!</h2>
                <p>Hello <strong>{username}</strong>,</p>
                <p>Welcome to CodeMaster! Start your coding journey today.</p>
                <p>Best regards,<br>CodeMaster Team</p>
            </body>
        </html>
        """,
        priority="high"
    )
    
    result = await sender.send_single_email(message)
    await sender.close()
    return result

async def send_password_reset_email(email: str, reset_token: str) -> Dict:
    """Send password reset email"""
    sender = FastEmailSender()
    
    reset_link = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={reset_token}"
    
    message = EmailMessage(
        to_email=email,
        subject="Password Reset - CodeMaster",
        body=f"Click the link to reset your password: {reset_link}",
        html_body=f"""
        <html>
            <body>
                <h2>Password Reset</h2>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_link}" style="background-color: #4CAF50; color: white; padding: 15px 32px; text-decoration: none; display: inline-block;">Reset Password</a>
                <p>If the button doesn't work, copy this link: {reset_link}</p>
            </body>
        </html>
        """,
        priority="high"
    )
    
    result = await sender.send_single_email(message)
    await sender.close()
    return result

async def send_newsletter_bulk(emails: List[str], subject: str, content: str, html_content: str = None) -> Dict:
    """Send newsletter to multiple recipients"""
    sender = FastEmailSender()
    
    messages = [
        EmailMessage(
            to_email=email,
            subject=subject,
            body=content,
            html_body=html_content,
            priority="normal"
        )
        for email in emails
    ]
    
    result = await sender.send_batch_optimized(messages, batch_size=100)
    await sender.close()
    return result

# Example usage and testing
async def test_email_sender():
    """Test the email sender"""
    sender = FastEmailSender()
    
    # Test single email
    message = EmailMessage(
        to_email="test@example.com",
        subject="Test Email",
        body="This is a test email",
        html_body="<h1>This is a test email</h1>",
        priority="high"
    )
    
    result = await sender.send_single_email(message)
    print("Single email result:", result)
    
    # Test bulk emails
    bulk_messages = [
        EmailMessage(
            to_email=f"test{i}@example.com",
            subject=f"Bulk Test Email {i}",
            body=f"This is bulk test email {i}",
            priority="normal"
        )
        for i in range(10)
    ]
    
    bulk_result = await sender.send_bulk_emails(bulk_messages)
    print("Bulk email result:", bulk_result)
    
    await sender.close()

if __name__ == "__main__":
    # Run test
    asyncio.run(test_email_sender())