describe('State Machine Library', function() {
	//core tests
	require('./creation.test');
	require('./transitions.test');
	require('./decorators.test');
	require('./interruption.test');
	require('./restarting.test');
	//extensions
	require('./exec.test');
	require('./submachine.test');
	require('./threads.test');
	require('./wait.test');
});