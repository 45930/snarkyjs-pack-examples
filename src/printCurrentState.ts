import { Mina, PrivateKey, fetchAccount } from 'snarkyjs';
import fs from 'fs/promises';
import { BigContract } from './BigContract.js';

// check command line arg
let deployAlias = process.argv[2];
if (!deployAlias)
  throw Error(`Missing <deployAlias> argument.

Usage:
node build/src/interact.js <deployAlias>
`);
Error.stackTraceLimit = 1000;

// parse config and private key from file
type Config = {
  deployAliases: Record<
    string,
    {
      url: string;
      keyPath: string;
      fee: string;
      feepayerKeyPath: string;
      feepayerAlias: string;
    }
  >;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[deployAlias];
let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network(config.url);
Mina.setActiveInstance(Network);
let zkAppAddress = zkAppKey.toPublicKey();
await fetchAccount({ publicKey: zkAppAddress });
let zkApp = new BigContract(zkAppAddress);

console.log('ZKAPP ipfs hash', zkApp.ipfsHash.get().toString());
console.log('ZKAPP counter 1', zkApp.counters1.get().toBigInts());
console.log('ZKAPP counter 2', zkApp.counters2.get().toBigInts());
console.log('ZKAPP counter 3', zkApp.counters3.get().toBigInts());
console.log('ZKAPP feature flags', zkApp.featureFlags.get().toBooleans());
