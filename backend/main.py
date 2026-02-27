#Entry point (FastAPI)
import os 
"""
Built-in python module that allows the program to interact with the os
he bridge from the python code to things like Files, Folders, Environment Variables, System paths, and more
For this use case it is used to get env variables
"""
from fastapi import FastAPI #Imports the framework that handles web requests (GET, POST).
from mangum import Mangum #This is the bridge. AWS Lambda doesn't understand FastAPI by default; Mangum "wraps" FastAPI so Lambda can run it.
from pydantic import BaseModel #Ensures that the data coming into my API is formatted correctly
from inventory_tools import fetch_low_stock_report
import boto3 # The official AWS SDK. It’s what we use to talk to S3 and the Nova AI model in Bedrock.
import json

app = FastAPI() #Creates a web application instance that will handle requests, routes, validation, and documentation

#Allows lambda to talk to FastAPI
handler = Mangum(app) #AWS Lambda calls this handler to start the engine

class AuditRequest(BaseModel): #Defines what the request body should look like. 
    check_type: str = "discrepancy" #checks for a discrepancy"

@app.get("/") #GET Request to check if the server is awake 
def read_root():
    return {"status": "Auditor API is live"}

@app.post("/run-audit") #Use POST instead of get to trigger this run-audit action 
def run_audit(request: AuditRequest): #Initializes the bedrock client.How the code prepares to send low-inventory numbers and S3 images to the NOVA AI model for analysis
    #1 Fetch From MySQL (RDS) AMAZON RDS is a fully managed cloud database that simplifies the process of setting up, operating, and scaling a MySQL relational database
    report = fetch_low_stock_report()

    #2 Logic to invoke Nova via Bedrock
    bedrock = boto3.client("bedrock-runtime",region_name=os.getenv("AWS_REGION"))

    #Example Nova lite call for the hackathon
    return {
        "inventory status": report,
        "agent_analysis": "Nova Agent is analyzing S3 images...",
        "discrepancy found": True
    }
    