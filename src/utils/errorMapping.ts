export const mapAuthErrorToMessage = (code: string): string => {
  console.log("Firebase Auth Error Code:", code);
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is poorly formatted.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Only one sign-in popup can be open at a time.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return `Error (${code}): Please check your credentials or try joining the network if you don't have an account.`;
  }
};
