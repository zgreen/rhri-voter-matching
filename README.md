# RHRI Member Data Scraper

This is a Node CLI script to scrape Mailchimp data from the Rhode Island SOS website in order to add additional info the Mailchimp database.

## Usage examples:

### Log the output
```
./index.js --log
```

### Get data for a specific member via Mailchimp ID
```
./index.js --id=bsubakf9fo01903r0923
```

### Pass a direct query to the SOS website
```
./index.js --address='1 Main Street' --zip='00000', --city=Providence
```

## TODOS
- Write a `PATCH` request to update the Mailchimp DB.
