# RHRI Member Data Scraper

This is a Node CLI script to scrape Mailchimp data from the Rhode Island SOS website in order to add additional info the Mailchimp database.

## Install

1. Pull down this repo
2. Ensure you've got Node >= 7.9.0 and npm >= 4.2.0
3. `npm install`

## Data
Note that this repo currently queries a local `members.json` data file, and not the Mailchimp API directly. You'll need this file if you want to run this CLI locally. If you have API access, you can download the members list into a `members.json` file.

## Usage
This repo contains a single Node.js executable, `index.js`. The following args are valid:

| Argument    | Type     | Description    |
| ----------- | -------- | -----------    |
| `log`       | `bool`   | Log the output |
| `id`        | `string` | Get the data for a specific Mailchimp ID |
| `zip`       | `string` | Pass a specific zipcode to the query |
| `address`   | `string` | Pass a specific address to the query |
| `city`      | `string` | Pass a specific city to the query |
| `recursive` | `bool`   | Run successive queries, recursively |
| `max`       | `number` | Maximum number of successive queries to run recursively. Default `10`. |

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

### Query members recursively
```
./index.js --recursive
```

### Set a max number of default queries (default is `10`; queries will be run every five seconds):
```
./index.js --recursive --max=100
```

## TODOS
- Write a `PATCH` request to update the Mailchimp DB.
