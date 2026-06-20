// SPIKE ONLY
// This file is experimental code for Stellar SDK integration spike (CLI-027)
// DO NOT USE IN PRODUCTION

// CRITICAL: Load URL polyfill BEFORE Stellar SDK import
import 'react-native-url-polyfill/auto';
import { Keypair, Server } from '@stellar/stellar-sdk';
import 'react-native-get-random-values';

/**
 * Test keypair generation
 * Calls Keypair.random() to generate a new Stellar keypair
 * 
 * Expected behavior:
 * - Should return keypair with publicKey (G-prefix) and secret (S-prefix)
 * - Should have working sign() function
 * - Should not crash in Expo dev client
 * 
 * Security note: This is spike only; never expose or log secrets in production
 */
export async function testKeypairGeneration() {
  try {
    const pair = Keypair.random();
    const publicKey = pair.publicKey();
    const secret = pair.secret();

    console.log('✅ Keypair Generation Success:', {
      publicKey: publicKey,
      secretPrefix: secret.substring(0, 2), // S- only, never full secret
      canSign: typeof pair.sign === 'function',
      publicKeyPrefix: publicKey.substring(0, 1) // G- prefix check
    });

    return pair;
  } catch (error) {
    console.error('❌ Keypair Generation Failed:', {
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Test Horizon API query
 * Loads account data from Stellar testnet Horizon server
 * 
 * Expected behavior:
 * - Should query https://horizon-testnet.stellar.org without errors
 * - Should return account object with id, sequence, balances
 * - Should not crash due to missing polyfills
 */
export async function testHorizonQuery(publicKey: string) {
  try {
    const server = new Server('https://horizon-testnet.stellar.org');
    const account = await server.loadAccount(publicKey);

    console.log('✅ Horizon Query Success:', {
      id: account.id,
      sequence: account.sequence,
      balanceCount: account.balances.length,
      balances: account.balances.map((b: any) => ({
        assetType: b.asset_type,
        assetCode: b.asset_code || 'XLM',
        balance: b.balance,
        issuer: b.issuer || 'native'
      }))
    });

    return account;
  } catch (error) {
    console.error('❌ Horizon Query Failed:', {
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Combined test: Generate keypair and query Horizon
 * This validates end-to-end Stellar SDK functionality
 */
export async function testStellarIntegration() {
  try {
    console.log('🔄 Starting Stellar Integration Test...');

    // Step 1: Generate keypair
    const pair = await testKeypairGeneration();
    const publicKey = pair.publicKey();

    // Step 2: Query Horizon with generated keypair
    console.log(`🔄 Querying Horizon for public key: ${publicKey}`);
    const account = await testHorizonQuery(publicKey);

    console.log('✅ Stellar Integration Test Complete');
    return { keypair: pair, account: account };
  } catch (error) {
    console.error('❌ Stellar Integration Test Failed:', error);
    throw error;
  }
}
