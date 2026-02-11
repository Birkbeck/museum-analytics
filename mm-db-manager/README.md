# Mapping Museums Database Manager

This directory contains code for a Google Sheets based database management system for the Mapping Museums Database.

- `apps-script` a Typescript package deployed to the Apps Script project connected to the Google Spreadsheet using `clasp`. This package is responsible for the user interface, sending data to the cloud, and delivering success or error messages to the user.
- `cloud` a Flask app deployed to the Google Cloud Platform. The app exposes an API used by the Apps Script project and is responsible for validating data on the user input sheets and making changes to the protected database sheet.
- `terraform` Terraform scripts for the deployment of code in `cloud` onto Google Cloud Functions. This does *not* deploy the code in `apps-script` to the Google Spreadsheet.

## Deployment

After any changes to the code in `cloud`, re-deploy by navigating to `terraform` and running the deploy command:

```
cd terraform
terraform apply -var=project_id=mm-db-manager
```

After any changes to the code in `apps-script`, follow instructions in `apps-script/README.md` to redeploy to the Apps Script project.

## Changing the secret

The cloud-run Flask app uses an HMAC secret to prevent unauthorised use of the app. To generate a new secret, run:

```
python generate-secret.py
```

Copy the generated string and store it in both the Apps Script project and the Google Cloud project.

In Apps Script, go to Apps Script → Project Settings → Script Properties → Add:

```
API_BASE_URL = url_generated_by_terraform (should only change if you deploy to a new account)
API_HMAC_SECRET = your_generated_secret
```