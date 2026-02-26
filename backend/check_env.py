import os 
from dotenv import load_dotenv

#This returns True if it finds a .env file, False if it doesn't
found_env = load_dotenv() 

print(f"Did I find a .env file? {found_env}")
print(f"What is in AWS_REGION? {os.getenv('AWS_REGION')}")
print(f"Current working directory: {os.getcwd()}")