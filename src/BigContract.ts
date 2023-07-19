import { SmartContract, state, State, method, Provable, Bool } from 'snarkyjs';
import {
  PackedBoolFactory,
  PackedStringFactory,
  PackedUInt32Factory,
} from 'snarkyjs-pack';

class IpfsHash extends PackedStringFactory(60) {}
class PackedCounters extends PackedUInt32Factory(7) {}
class PackedBools extends PackedBoolFactory(254) {}

export class BigContract extends SmartContract {
  @state(IpfsHash) ipfsHash = State<IpfsHash>();
  @state(PackedCounters) counters1 = State<PackedCounters>();
  @state(PackedCounters) counters2 = State<PackedCounters>();
  @state(PackedCounters) counters3 = State<PackedCounters>();
  @state(PackedBools) featureFlags = State<PackedBools>();

  init() {
    super.init();

    this.ipfsHash.set(
      IpfsHash.fromString('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')
    );
    this.counters1.set(PackedCounters.fromBigInts([0n, 0n]));
    this.counters2.set(
      PackedCounters.fromBigInts([0n, 0n, 0n, 0n, 0n, 0n, 0n])
    );
    this.counters3.set(PackedCounters.fromBigInts([0n, 0n]));
    this.featureFlags.set(PackedBools.fromBooleans([false, false, false]));
  }

  @method
  updateIpfsHash(oldHash: IpfsHash, newHash: IpfsHash) {
    this.ipfsHash.getAndAssertEquals();
    this.ipfsHash.assertEquals(oldHash);
    this.ipfsHash.set(newHash);
  }

  @method
  incrementCounters1() {
    const counters = this.counters1.getAndAssertEquals();
    const unpacked = PackedCounters.unpack(counters.packed);
    counters.packed.assertEquals(PackedCounters.pack(unpacked));
    unpacked[0] = unpacked[0].add(1);
    unpacked[1] = unpacked[1].add(2);
    const newCounters = PackedCounters.fromAuxiliary(unpacked);
    this.counters1.set(newCounters);
  }

  @method
  toggleFeatureFlagA() {
    const ffs = this.featureFlags.getAndAssertEquals();
    const unpacked = PackedBools.unpack(ffs.packed);
    ffs.packed.assertEquals(PackedBools.pack(unpacked));
    const newVal = Provable.if(unpacked[0], Bool(false), Bool(true));
    unpacked[0] = newVal;
    const newFfs = PackedBools.fromAuxiliary(unpacked);
    this.featureFlags.set(newFfs);
  }
}
