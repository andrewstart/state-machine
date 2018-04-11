import {SingleSessionMachine, ERROR_PREFIX} from '../';
import {Resolver, TestSession, ExtPromise} from './utils';
import assert = require('assert');

describe(`SingleSessionMachine`, function() {
    it(`Can run through`, function() {
        const sm = new SingleSessionMachine<TestSession, number>();
        const first = new Resolver(`First`, `trans`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`trans`, first, last);
        sm.addTransition(``, last);
        return sm.run({})
        .then((result) => {
            assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
            assert.equal(result[0], `output`, `Final out transition should be that returned by the last state`);
            assert.equal(result[1], 42, `Final out value should be that returned by the last state`);
        });
    });

    it(`Running a running SingleSessionMachine throws an error`, function() {
        assert.throws(() => {
            const sm = new SingleSessionMachine<TestSession, number>();
            const first = new Resolver(`First`, `trans`);
            sm.addTransition(null, null, first);
            const last = new Resolver(`Last`, `output`, 42);
            sm.addTransition(`trans`, first, last);
            sm.addTransition(``, last);
            const session = {};
            sm.run(session);
            sm.run(session);
        }, `Should throw an error upon run()`);
    });
    
    it(`Can be stopped`, function() {
        const sm = new SingleSessionMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`trans`, first, last);
        sm.addTransition(``, last);
        const session = {};
        sm.run(session)
        .then((result) => {
            throw new Error(`Should not have resolved`);
        });
        sm.stop();
        assert(last.onEntrySpy.notCalled, `Last state should not have been entered`);
        //private property check!
        assert.equal((sm as any).threads.has(session), false, `Should not retain threads for session`);
    });

    it(`Can 'stop' non-running SingleSessionMachines`, function() {
        const sm = new SingleSessionMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`trans`, first, last);
        sm.addTransition(``, last);
        sm.stop();
    });

    it(`Can interrupt`, function() {
        const sm = new SingleSessionMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`${ERROR_PREFIX}interrupt`, null, last);
        sm.addTransition(``, last);
        const session = {};
        const result = sm.run(session)
        .then((result) => {
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert(first.cancelSpy.calledOnce, `First state should have been cancelled`);
            assert.equal(last.onEntrySpy.getCall(0).args[3], `${ERROR_PREFIX}interrupt`, `Catching state should have been entered with the interrupt transition`);
            assert.equal(last.onEntrySpy.getCall(0).args[2], `foobar`, `Catching state should have been entered with the interrupt data`);
        });
        sm.interrupt(`interrupt`, `foobar`);
        return result;
    });

    it(`Can interrupt with the session`, function() {
        const sm = new SingleSessionMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`${ERROR_PREFIX}interrupt`, null, last);
        sm.addTransition(``, last);
        const session = {};
        const result = sm.run(session)
        .then((result) => {
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert(first.cancelSpy.calledOnce, `First state should have been cancelled`);
            assert.equal(last.onEntrySpy.getCall(0).args[3], `${ERROR_PREFIX}interrupt`, `Catching state should have been entered with the interrupt transition`);
            assert.equal(last.onEntrySpy.getCall(0).args[2], `foobar`, `Catching state should have been entered with the interrupt data`);
        });
        sm.interrupt(session, `interrupt`, `foobar`);
        return result;
    });

    it(`Interrupting improperly throws an error`, function() {
        assert.throws(() => {
            const sm = new SingleSessionMachine<TestSession, number>();
            const first = new ExtPromise(`First`);
            sm.addTransition(null, null, first);
            const last = new Resolver(`Last`, `output`, 42);
            sm.addTransition(`${ERROR_PREFIX}interrupt`, null, last);
            sm.addTransition(``, last);
            const session = {};
            sm.run(session)
            .then((result) => {
                assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
                assert(first.cancelSpy.calledOnce, `First state should have been cancelled`);
                assert.equal(last.onEntrySpy.getCall(0).args[3], `${ERROR_PREFIX}interrupt`, `Catching state should have been entered with the interrupt transition`);
                assert.equal(last.onEntrySpy.getCall(0).args[2], `foobar`, `Catching state should have been entered with the interrupt data`);
            });
            sm.interrupt({}, `interrupt`, `foobar`);
        }, `Should throw an error if given a non-transition, non-active session param`);
    });
});