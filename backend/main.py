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
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

app = FastAPI() #Creates a web application instance that will handle requests, routes, validation, and documentation

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

# Add this block right after 'app = FastAPI()'
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for the hackathon
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Allows lambda to talk to FastAPI
handler = Mangum(app) #AWS Lambda calls this handler to start the engine

class AuditRequest(BaseModel): #Defines what the request body should look like. 
    check_type: str = "discrepancy" #checks for a discrepancy"

@app.get("/") #GET Request to check if the server is awake 
def read_root():
    return {"status": "Auditor API is live"}


@app.post("/run-audit")
def run_audit(request: AuditRequest):
    report = fetch_low_stock_report()

    bedrock = boto3.client("bedrock-runtime", region_name=os.getenv("us-west-1"))

    prompt = f"Here is a low stock inventory report: {json.dumps(report)}. Identify discrepancies and suggest reorder quantities."

    response = bedrock.invoke_model(
    modelId="us.amazon.nova-lite-v1:0",
    body=json.dumps({
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        "inferenceConfig": {
            "maxTokens": 512,
            "temperature": 0.7
        }
    }),
    contentType="application/json",
    accept="application/json"
)

    result = json.loads(response["body"].read())

    # Extract the text from Nova's response
    agent_text = result["output"]["message"]["content"][0]["text"]

    return {
        "inventory_status": report,
        "agent_analysis": agent_text,
        "discrepancy_found": len(report) > 0
}