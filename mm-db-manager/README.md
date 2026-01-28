# MM DB Manager

The Typescript files in this directory define the Google Apps Script functionality for the Google Sheets interface to the Mapping Museums Database.

## Before you first deploy

Changes made locally to the files can be deployed to the Google Sheet using CLASP.

Make sure you have CLASP installed:

```
npm install -g @google/clasp
```

Login to the Google Account which owns the sheet and script:

```
clasp login
```

Find the script ID of the Apps Script and clone it locally:

```
clasp clone <script ID>
```

Enable the Apps Scripts API at:

```
https://script.google.com/home/usersettings
```

## Deploying

Push the code to the Google Apps Script:

```
npm run push
```

This will build the Typescript files in `src`, output them into `dist` and then push them to the remote Google Apps Script.