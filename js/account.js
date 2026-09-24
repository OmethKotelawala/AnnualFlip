const form = document.querySelector('#account-form');
const signInTab = document.querySelector('#signin-tab');
const signUpTab = document.querySelector('#signup-tab');
const nameFields = document.querySelector('#name-fields');
const accountTitle = document.querySelector('#account-title');
const accountSubtitle = document.querySelector('#account-subtitle');
const submitButton = document.querySelector('#submit-button');
const rememberOption = document.querySelector('#remember-option');
const forgotButton = document.querySelector('#forgot-button');
const password = document.querySelector('#password');
const passwordToggle = document.querySelector('#password-toggle');
const formStatus = document.querySelector('#form-status');

let currentMode = 'signin';

function setMode(mode) {
	currentMode = mode;
	const isSignUp = mode === 'signup';

	signInTab.classList.toggle('is-active', !isSignUp);
	signUpTab.classList.toggle('is-active', isSignUp);
	signInTab.setAttribute('aria-selected', String(!isSignUp));
	signUpTab.setAttribute('aria-selected', String(isSignUp));
	nameFields.hidden = !isSignUp;
	accountTitle.textContent = isSignUp ? 'Create your workspace' : 'Welcome back';
	accountSubtitle.textContent = isSignUp ? 'Start building beautiful flipbooks today.' : 'Sign in to continue to your workspace.';
	submitButton.textContent = isSignUp ? 'Create account' : 'Sign in';
	rememberOption.hidden = isSignUp;
	forgotButton.hidden = isSignUp;
	formStatus.textContent = '';
	formStatus.classList.remove('is-error');
}

signInTab.addEventListener('click', () => setMode('signin'));
signUpTab.addEventListener('click', () => setMode('signup'));

passwordToggle.addEventListener('click', () => {
	const isVisible = password.type === 'text';
	password.type = isVisible ? 'password' : 'text';
	passwordToggle.textContent = isVisible ? 'Show' : 'Hide';
	passwordToggle.setAttribute('aria-label', `${isVisible ? 'Show' : 'Hide'} password`);
});

form.addEventListener('submit', (event) => {
	event.preventDefault();
	formStatus.classList.remove('is-error');

	if (!form.reportValidity()) return;

	formStatus.textContent = currentMode === 'signup'
		? 'Your workspace is ready to set up.'
		: 'Sign-in is ready to connect to your account service.';
});

forgotButton.addEventListener('click', () => {
	formStatus.classList.remove('is-error');
	formStatus.textContent = 'Password reset instructions will be sent to your email.';
});

document.querySelectorAll('[data-provider]').forEach((button) => {
	button.addEventListener('click', () => {
		formStatus.classList.remove('is-error');
		formStatus.textContent = `${button.dataset.provider} sign-in is ready to connect.`;
	});
});
