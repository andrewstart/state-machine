import {StateMachine} from '../';
import {ExtPromise, Resolver, TestSession} from './utils';
import assert = require('assert');

describe(`Restarting`, function() {
    it(`Can start in a targeted state`, function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const mid = new Resolver(`Mid`, `trans`, `foo`);
        sm.addTransition(``, first, mid);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`trans`, mid, last);
        sm.addTransition(``, last);
        return sm.run({}, mid, `bar`)
        .then((result) => {
            assert(first.onEntrySpy.notCalled, `First state should not have been entered`);
            assert(mid.onEntrySpy.calledOnce, `Targeted entry state should have been entered`);
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert(mid.onEntrySpy.calledBefore(last.onEntrySpy), `Targeted entry state should have been entered before last state`);
            assert.equal(mid.onEntrySpy.firstCall.args[2], `bar`, `Targeted entry state should have been given the run() input`);
        });
    });
    
    it(`Can restart in a targeted state`, function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const mid = new Resolver(`Mid`, `trans`, `foo`);
        sm.addTransition(``, first, mid);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`trans`, mid, last);
        sm.addTransition(``, last);
        const session = {};
        sm.run(session);
        sm.stop(session);
        return sm.run(session, mid, `bar`)
        .then((result) => {
            assert(mid.onEntrySpy.calledOnce, `Targeted entry state should have been entered`);
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert(mid.onEntrySpy.calledBefore(last.onEntrySpy), `Targeted entry state should have been entered before last state`);
            assert.equal(mid.onEntrySpy.firstCall.args[2], `bar`, `Targeted entry state should have been given the run() input`);
        });
    });
});