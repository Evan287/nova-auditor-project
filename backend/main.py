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
from inventory_tools import fetch_low_stock_report, get_db_connection
import boto3 # The official AWS SDK. It’s what we use to talk to S3 and the Nova AI model in Bedrock.
import json
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request, UploadFile, File
from fastapi.responses import JSONResponse
import base64

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

#Structure to approve a request, has the part and the quantity we need to purchase
class ApproveRequest(BaseModel):
    part_name: str 
    quantity: int


#Allows lambda to talk to FastAPI
handler = Mangum(app) #AWS Lambda calls this handler to start the engine

class AuditRequest(BaseModel): #Defines what the request body should look like. 
    check_type: str = "discrepancy" #checks for a discrepancy"

@app.get("/") #GET Request to check if the server is awake 
def read_root():
    return {"status": "Auditor API is live"}

@app.post("/approve-order")
def approve_order(request: ApproveRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Look up vendor URL from inventory table
        cursor.execute(
            "SELECT vendor_url FROM inventory WHERE part_name = %s",
            (request.part_name,)
        )
        inventory_item = cursor.fetchone()
        vendor_url = inventory_item["vendor_url"] if inventory_item else None

        # Save order with vendor URL
        cursor.execute(
            "INSERT INTO orders (part_name, quantity, status, vendor_url, created_at) VALUES (%s, %s, 'approved', %s, NOW())",
            (request.part_name, request.quantity, vendor_url)
        )
        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True, "message": f"Order approved for {request.part_name}"}
    except Exception as e:
        raise RuntimeError(f"Failed to approve order: {str(e)}")
    
@app.post("/verify-shipment")
async def verify_shipment(file: UploadFile = File(...)):
    try:
        # Read the image and convert to base64
        image_bytes = await file.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        # Fetch approved orders from the database
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT part_name, quantity FROM orders WHERE status = 'approved'")
        orders = cursor.fetchall()
        cursor.close()
        conn.close()

        # Build the prompt
        orders_text = json.dumps(orders)
        # Format orders more cleanly
        # Format orders with vendor info
        orders_summary = "\n".join([
            f"- {o['part_name']}: {o['quantity']} units, vendor: {o.get('vendor_url', 'not specified')}"
            for o in orders
        ])

        prompt = f"""You are a shipment verification assistant checking incoming deliveries.

        Approved orders on file:
        {orders_summary}

        Please examine the shipment label in the image and:
        1. List what you see on the label (part name, quantity, vendor)
        2. Check if it matches one of the approved orders above
        3. Note any differences in part name, quantity, or vendor
        4. State whether to accept or reject the shipment and why"""

        # Call Nova with the image
        bedrock = boto3.client("bedrock-runtime", region_name="us-west-1")
        response = bedrock.invoke_model(
            modelId="us.amazon.nova-lite-v1:0",
            body=json.dumps({
                "messages": [{
                    "role": "user",
                    "content": [
                        {
                            "image": {
    "format": file.content_type.split("/")[1],
    "source": {
        "bytes": image_b64
    }
}
                        },
                        {
                            "text": prompt
                        }
                    ]
                }],
                "inferenceConfig": {
                    "maxTokens": 512,
                    "temperature": 0.7
                }
            }),
            contentType="application/json",
            accept="application/json"
        )

        result = json.loads(response["body"].read())
        analysis = result["output"]["message"]["content"][0]["text"]

        return {
            "analysis": analysis,
            "discrepancy_found": "reject" in analysis.lower() or (
    ("discrepancy" in analysis.lower() or "mismatch" in analysis.lower()) and
    "no discrepan" not in analysis.lower() and
    "no mismatch" not in analysis.lower()
)
        }

    except Exception as e:
        raise RuntimeError(f"Shipment verification failed: {str(e)}")

#Run Audit button and logic
#Communicate with Nova to get the discrepancies 
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