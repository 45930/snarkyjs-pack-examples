import {
  PackedStringFactory,
  PackedUInt32Factory,
  PackedBoolFactory,
} from 'snarkyjs-pack';
import { BigContract } from './BigContract';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate } from 'snarkyjs';

class IpfsHash extends PackedStringFactory(60) {}
class PackedCounters extends PackedUInt32Factory(7) {}
class PackedBools extends PackedBoolFactory(254) {}

let proofsEnabled = true;

describe('BigContract', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppBigContractress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: BigContract;

  const emptyPackedBigints = new Array(7).fill(0n);
  const emptyPackedBooleans = new Array(254).fill(false);

  beforeAll(async () => {
    if (proofsEnabled) await BigContract.compile();
    console.log('done compiling');
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppBigContractress = zkAppPrivateKey.toPublicKey();
    zkApp = new BigContract(zkAppBigContractress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` BigContracts an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `BigContract` smart contract with initial state', async () => {
    await localDeploy();
    const ipfsHash = zkApp.ipfsHash.get();
    const counters1 = zkApp.counters1.get();
    const counters2 = zkApp.counters2.get();
    const counters3 = zkApp.counters3.get();
    const featureFlags = zkApp.featureFlags.get();

    expect(ipfsHash.toString()).toBe(
      'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    );
    expect(counters1.toBigInts()).toMatchObject(emptyPackedBigints);
    expect(counters2.toBigInts()).toMatchObject(emptyPackedBigints);
    expect(counters3.toBigInts()).toMatchObject(emptyPackedBigints);
    expect(featureFlags.toBooleans()).toMatchObject(emptyPackedBooleans);
  });

  it('updates a string value', async () => {
    await localDeploy();

    const oldHash = IpfsHash.fromAuxiliary(
      IpfsHash.fromString('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG').aux
    );
    const newHash = IpfsHash.fromAuxiliary(
      IpfsHash.fromString('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojZZZZZZ').aux
    );
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.updateIpfsHash(oldHash, newHash);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const updatedIpfsHash = zkApp.ipfsHash.get();
    expect(updatedIpfsHash.toString()).toEqual(
      'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojZZZZZZ'
    );
  });

  it('updates a uint value', async () => {
    await localDeploy();
    const incremented = [...emptyPackedBigints];
    incremented[0] = 1n;
    incremented[1] = 2n;
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.incrementCounters1();
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const updatedCounters = zkApp.counters1.get();
    expect(updatedCounters.toBigInts()).toMatchObject(incremented);
  });

  it('updates a bool value', async () => {
    await localDeploy();
    const newFeatureFlags = [...emptyPackedBooleans];
    newFeatureFlags[0] = true;
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.toggleFeatureFlagA();
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const updatedFeatureFlags = zkApp.featureFlags.get();
    expect(updatedFeatureFlags.toBooleans()).toMatchObject(newFeatureFlags);
  });
});
