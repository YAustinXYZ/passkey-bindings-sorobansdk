// SPIKE ONLY
// This file is experimental code for passkey integration spike (CLI-013)
// DO NOT USE IN PRODUCTION

import Passkey from 'react-native-passkey';
import { Buffer } from 'buffer';
import 'react-native-get-random-values';

/**
 * Test passkey registration flow
 * Generates a challenge and calls Passkey.create() to initiate registration
 * 
 * Expected behavior:
 * - Should return attestation object with id, type, transports
 * - Should not crash in Expo dev client with custom dev client installed
 */
export async function testPasskeyRegistration() {
  try {
    const challenge = Buffer.from('test-challenge-' + Date.now());
    const response = await Passkey.create({
      challenge: challenge.toString('base64'),
      userId: 'test-user-' + Date.now(),
      userName: 'testuser',
      displayName: 'Test User Spike'
    });

    console.log('✅ Passkey Registration Success:', {
      id: response.id,
      type: response.type,
      transports: response.transports,
      attestationObject: response.response?.attestationObject ? 'present' : 'missing',
      clientDataJSON: response.response?.clientDataJSON ? 'present' : 'missing'
    });

    return response;
  } catch (error) {
    console.error('❌ Passkey Registration Failed:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: (error as any)?.code
    });
    throw error;
  }
}

/**
 * Test passkey authentication flow
 * Calls Passkey.get() to authenticate with registered passkey
 * 
 * Expected behavior:
 * - Should return assertion object with signature and clientDataJSON
 * - authenticatorAttachment should indicate 'platform' (biometric) or 'cross-platform'
 * - Should not crash in Expo dev client
 */
export async function testPasskeyAuthentication() {
  try {
    const challenge = Buffer.from('auth-challenge-' + Date.now());
    const response = await Passkey.get({
      challenge: challenge.toString('base64'),
      rpId: 'example.com'
    });

    console.log('✅ Passkey Authentication Success:', {
      id: response.id,
      authenticatorAttachment: response.authenticatorAttachment,
      signature: response.response?.signature ? 'present' : 'missing',
      clientDataJSON: response.response?.clientDataJSON ? 'present' : 'missing',
      userVerified: response.response?.userVerified ?? 'unknown'
    });

    return response;
  } catch (error) {
    console.error('❌ Passkey Authentication Failed:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: (error as any)?.code
    });
    throw error;
  }
}
