var test = require('ava')
var indy = require('../')
var cuid = require('cuid')
var initTestPool = require('./helpers/initTestPool')
var tempy = require('tempy')

test('cache', async function (t) {
  var pool = await initTestPool()
  var walletConfig = { 'id': 'wallet-' + cuid() }
  var walletCredentials = { 'key': 'key' }
  await indy.createWallet(walletConfig, walletCredentials)
  var wh = await indy.openWallet(walletConfig, walletCredentials)
  var [trusteeDid] = await indy.createAndStoreMyDid(wh, { seed: '000000000000000000000000Trustee1' })
  var [myDid, myVerkey] = await indy.createAndStoreMyDid(wh, { })
  var schemaName = 'schema-' + cuid()
  var [schemaId, schema] = await indy.issuerCreateSchema(myDid, schemaName, '1.0', ['name', 'age'])

  var defaultGetCacheOptions = {
    'noCache': false,
    'noUpdate': false,
    'noStore': false,
    'minFresh': -1
  }

  var defaultPurgeCacheOptions = {
    'maxAge': -1
  }

  // Schema
  req = await indy.buildSchemaRequest(myDid, schema)
  req = await indy.signRequest(wh, myDid, req)
  res = await indy.submitRequest(pool.handle, req)

  var schemaRes = await indy.getSchema(pool.handle, wh, myDid, schemaId, defaultGetCacheOptions)
  t.is(schemaRes.name, schema.name)

  await indy.purgeSchemaCache(wh, defaultPurgeCacheOptions)

  // Cred Def
  var [credDefId, credDef] = await indy.issuerCreateAndStoreCredentialDef(wh, myDid, schema, 'TAG', 'CL', { support_revocation: false })
  req = await indy.buildCredDefRequest(myDid, credDef)
  res = await indy.signAndSubmitRequest(pool.handle, wh, myDid, req)

  var credDefRes = await indy.getCredDef(pool.handle, wh, myDid, credDefId, defaultGetCacheOptions)
  t.is(credDefRes.id, credDef.id)

  await indy.purgeCredDefCache(wh, defaultPurgeCacheOptions)

  // cleanup
  await indy.closeWallet(wh)
  await indy.deleteWallet(walletConfig, walletCredentials)
  pool.cleanup()
})
