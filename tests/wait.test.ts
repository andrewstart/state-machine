import {StateMachine, Wait} from '../';
import {Resolver, TestSession} from './utils';
import assert = require('assert');
import sinon = require('sinon');

describe(`Wait State`, function() {
    beforeEach(function() {
        this.sandbox = sinon.createSandbox({useFakeTimers:true});
    });
    
    afterEach(function() {
        this.sandbox.restore();
    });
    
    it(`Wait resolves after the specified time`, function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new Wait(`First`, 30);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(``, first, last);
        sm.addTransition(``, last);
        const result = sm.run({})
        .then((result) => {
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert.equal(result[0], `output`, `Final out transition should be that returned by the last state`);
            assert.equal(result[1], 42, `Final out value should be that returned by the last state`);
        });
        //now tick the clock
        this.sandbox.clock.tick(31);
        return result;
    });
    
    it(`Wait does not resolve or reject before the specified time`, async function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new Wait(`First`, 30);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(``, first, last);
        sm.addTransition(``, last);
        sm.run({})
        .then((result) => {
            throw new Error(`Should not have resolved`);
        });
        //now tick the clock
        this.sandbox.clock.tick(28);
        //clean up timers so that we can let promises tick through
        this.sandbox.clock.restore();
        await new Promise(resolve => setTimeout(resolve, 10));
        assert(last.onEntrySpy.notCalled, `Wait should not have resolved`);
    });
    
    it(`Wait passes through output from previous state`, function() {
        //restore clock here because it interferes with promise resolution
        this.sandbox.clock.restore();
        
        const sm = new StateMachine<TestSession, number>();
        const first = new Resolver(`First`, `trans`, `foo`);
        sm.addTransition(null, null, first);
        const wait = new Wait(`Wait`, 30);
        sm.addTransition(``, first, wait);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(``, wait, last);
        sm.addTransition(``, last);
        const result = sm.run({})
        .then((result) => {
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert.equal(last.onEntrySpy.getCall(0).args[2], `foo`, `Wait should have passed input through as output`);
            assert.equal(last.onEntrySpy.getCall(0).args[3], `trans`, `Wait should have reused transition`);
        });
        return result;
    });
    
    it(`Cancelled Wait cleans up timer`, function() {
        const setSpy = sinon.spy(global, `setTimeout`);
        const clearSpy = sinon.spy(global, `clearTimeout`);
        
        const sm = new StateMachine<TestSession, number>();
        const first = new Wait(`First`, 30);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(``, first, last);
        sm.addTransition(``, last);
        const session = {};
        sm.run(session)
        .then((result) => {
            throw new Error(`Should not have resolved`);
        });
        sm.stop(session);
        assert(setSpy.calledOnce, `setTimeout should have been called once`);
        assert(clearSpy.calledOnce, `clearTimeout should have been called once`);
        assert(clearSpy.calledWith(setSpy.getCall(0).returnValue), `clearTimeout should have been called with the value from setTimeout`);
    });
});