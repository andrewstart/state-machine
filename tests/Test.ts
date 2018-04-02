import {StateMachine, Exec, Session} from '../';

interface MySession {
    foo: string;
}

const first = new Exec<MySession, void, {bar:number}>('First State', async (session, thread, input, trans) => {
    session.foo = 'Overriding foo';
    return ['transition', {bar:3}];
});

const second = new Exec<MySession, {bar:number}, string>('Second state', async (session:Session<MySession>, thread, input, trans) => {
    let interval;
    //once a second, log session.foo for input.bar # of times
    await thread.wrap(new Promise((resolve) => {
        interval = setInterval(() => {
            console.log(session.foo);
            if (--input.bar <= 0) {
                clearInterval(interval);
                resolve();
            }
        }, 1000);
    }), () => {
        clearInterval(interval);
    });
    return ['', 'all done'];
});

const last = new Exec<MySession, string, boolean>('First State', async (session, thread, input, trans) => {
    console.log('Previous state said ', input.toUpperCase());
    return [input, true];
});

const test = new StateMachine<MySession, boolean>();
//set up starting state
test.addTransition(null, null, first);
//set up first to middle state - output of first state must match input of second state
test.addTransition('transition', first, second);
//set up middle state to last state
test.addTransition('', second, last);
//set up final state -> completion - state output must match StateMachine output type
test.addTransition('all done', last);
//add a global error transition to catch all errors and go back to the first state
test.addTransition('~', null, first);

test.run({
    foo: 'bar'
}).then((output) => {
    const [finalTrans, result] = output;
    if (result === true) {
        console.log(finalTrans + ' was a success!');
    } else if (result === false) {
        console.log(finalTrans + ' was a lie!');
    }
});