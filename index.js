#!/usr/bin/env node
const fs = require('fs')

const axios = require('axios')
const chalk = require('chalk')
const cheerio = require('cheerio')
const cliArgs = require('minimist')(process.argv.slice(2), {string: 'zip'})
const {bold, yellow, red} = chalk

/**
 * Transform representative data string into a viable data object.
 *
 * @param {func} $ Cheerio-ed context.
 * @param {string} str Representative data string.
 * @return {Object} Data object.
 */
function prepareRepData ($, str) {
  return $(str).text().trim().split('\n').reduce((acc, cur, idx, arr) => {
    const obj = acc
    if (idx > 0) {
      obj[arr[idx - 1]] = cur.trim()
    }
    return obj
  }, {})
}

/**
 * Query voter data from the Sec. of State site.
 *
 * @param {Object} memberData Member data to look up info for.
 * @return {Object} Data object containing relevant district and rep data.
 */
function getVoterSOSPage (memberData = {}) {
  const {address, zip, city} = cliArgs
  const custom = address && zip && city
  const queryData = custom ? {address, zip, city} : memberData
  const {id, firstName, lastName} = custom
    ? {id: '', firstName: '', lastName: ''}
    : memberData
  const data = Object.assign({}, {id, firstName, lastName}, queryData)
  // Bail if no data.
  if (!data.address.length || !data.zip.length || !data.city.length) {
    console.log(red('No data.'))
    return
  }
  console.log(
    !custom
      ? yellow(
          `Requesting data for ${firstName} ${lastName}, id number ${bold(id)}...`
        )
      : yellow(`Requesting data for ${address}...`)
  )
  // Format data for URL query.
  const formattedData = Object.keys(data).reduce((acc, key) => {
    acc[key] = encodeURIComponent(data[key])
    return acc
  }, {})
  return new Promise(resolve =>
    // GET request.
    axios
      .get(
        `https://vote.sos.ri.gov/ovr/general?step=1&address%5Bgeneral%5D%5Bstate%5D=RI&address%5Bgeneral%5D%5Baddress_line_1%5D=${formattedData.address}&address%5Bgeneral%5D%5Bcity%5D=${formattedData.city}&address%5Bgeneral%5D%5Bzip%5D=${formattedData.zip}&general_address_validation_callback=general&submit=submit`
      )
      .catch(err => {
        console.error(err)
      })
      .then(resp => {
        /**
       * Load markup.
       */
        const $ = cheerio.load(resp.data)
        /**
       * District info
       */
        const districtData = $('h2')
          .filter((idx, el) => $(el).text().toLowerCase() === 'your district')
          .next()
          .text()
          .split('\n')
          .reduce((acc, string) => {
            const str = string.trim()
            if (str.length) {
              const info = str.trim().split(':')
              return acc.concat({
                [info[0].trim()]: parseInt(info[1].trim(), 10)
              })
            }
            return acc
          }, [])
        /**
       * Elected officials.
       */
        const officials = $('h2').filter(
          (idx, el) => $(el).text().toLowerCase() === 'your elected officials'
        )
        const $items = $($(officials).next()).find('.v-align-text').toArray()
        resolve(
          $items
            .reduce((acc, cur) => acc.concat(prepareRepData($, cur)), [])
            .concat(districtData)
            .map(item => {
              // Make keys uniform.
              const key = Object.keys(item)[0]
              const newKey = key
                .toLowerCase()
                .replace(/\s/g, '_')
                .replace(/\//g, '_or_')
              return {[newKey]: item[key]}
            })
        )
      })
  )
}

/**
 * Filter members to those that only include zip codes.
 *
 * @param {Object} err Error object.
 * @param {string} data Data string.
 @ @param {func} cb Callback function.
 */
function filterToValidMembers (err, data, cb) {
  if (err) {
    console.error(err)
    return
  }
  if (cb) {
    // Filter all members into relevant data.
    const members = JSON.parse(data)
      .members.map(member => {
        const {id, merge_fields} = member
        return {id, merge_fields}
      })
      .filter(member => {
        const {MMERGE3, MMERGE5} = member.merge_fields
        return (MMERGE3.zip || MMERGE5) && MMERGE3.addr1 && MMERGE3.city
      })
    // Filter members w/ zips.
    cb(members)
  }
}

/**
 * Read member data.
 *
 * @TODO Replace this with a Mailchimp API call.
 */
function readMemberData () {
  fs.readFile('./members.json', 'utf8', (err, data) => {
    filterToValidMembers(err, data, output)
  })
}

/**
 * Output data. Mostly for debugging.
 *
 * @param {array} members Array of members.
 * @param {Number} idx Query index. Default -1.
 * @param {bool} doRecursive Run the function recursively? Default false.
 * @param {Number} max Max number of queries to make.
 */
function output (members, index = 0, doRecursive = false, max = 10) {
  if (cliArgs['list-valid-members']) {
    console.log(JSON.stringify(members, null, 2))
    return
  }
  const idx = cliArgs.id
    ? members.reduce((acc, member, i) => {
      if (member.id === cliArgs.id) {
        acc = i
      }
      return acc
    }, 0)
    : index
  if (idx > -1) {
    const recursive = cliArgs.recursive || doRecursive
    const maxQueries = cliArgs.max || max
    const {id} = members[idx]
    const {FNAME: firstName, LNAME: lastName} = members[idx].merge_fields
    const {addr1: address, city} = members[idx].merge_fields.MMERGE3
    const zip = members[idx].merge_fields.MMERGE3.zip.length
      ? members[idx].merge_fields.MMERGE3.zip
      : members[idx].merge_fields.MMERGE4
    getVoterSOSPage({
      address,
      city,
      id,
      firstName,
      lastName,
      zip
    }).then(result => {
      if (cliArgs.log) {
        console.log(result)
      }
    })
    if (recursive && idx + 1 < maxQueries) {
      setTimeout(
        output.bind(null, members, idx + 1, recursive, maxQueries),
        5000
      )
    }
  }
}

readMemberData()
