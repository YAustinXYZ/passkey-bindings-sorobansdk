// SPIKE ONLY
// This file is experimental code for NFC integration spike (CLI-045)
// DO NOT USE IN PRODUCTION

import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

/**
 * Initialize NFC manager
 * Starts NFC manager and checks for NFC support on device
 * 
 * Expected behavior:
 * - Should return boolean indicating NFC support
 * - Should not crash on devices without NFC
 */
export async function initNfc() {
  try {
    // Start NFC manager (safe to call multiple times)
    NfcManager.start();

    const supported = await NfcManager.isSupported();
    console.log('✅ NFC Init Success:', {
      supported: supported,
      message: supported ? 'NFC available on device' : 'NFC not available'
    });

    return supported;
  } catch (error) {
    console.error('❌ NFC Init Failed:', {
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Test NDEF write operation
 * Writes JSON payload to NFC tag as NDEF text record
 * 
 * Validation:
 * - Calculates payload size before write
 * - Enforces 1.6 KB safety limit (1.8 KB technical limit - 200 bytes overhead)
 * 
 * Expected behavior:
 * - Should write JSON to tag as text record
 * - Should log actual byte size written
 * - Should fail gracefully on oversized payloads
 */
export async function testNdefWrite(payload: object) {
  try {
    const jsonString = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(jsonString);

    console.log(`📝 Payload size: ${bytes.byteLength} bytes (limit: 1600 bytes)`);

    // Enforce safety limit (1.8 KB technical - 200 bytes overhead = 1.6 KB)
    if (bytes.byteLength > 1600) {
      throw new Error(
        `Payload ${bytes.byteLength} bytes exceeds 1.6 KB safety limit for NFC tags`
      );
    }

    // Request NDEF technology
    await NfcManager.requestTechnology([NfcTech.Ndef]);

    // Create NDEF text record
    const record = Ndef.textRecord(jsonString);
    const message = [record];

    // Write message to tag
    await NfcManager.writeNdefMessage(message);

    console.log('✅ NDEF Write Success:', {
      payloadSize: bytes.byteLength,
      payloadSafetyMargin: 1600 - bytes.byteLength,
      recordCount: message.length,
      recordType: 'text'
    });
  } catch (error) {
    console.error('❌ NDEF Write Failed:', {
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    // CRITICAL: Always cleanup technology request
    await NfcManager.cancelTechnologyRequest();
  }
}

/**
 * Test NDEF read operation
 * Reads NDEF message from tag and parses JSON payload
 * 
 * Expected behavior:
 * - Should request NDEF technology
 * - Should read tag and parse NDEF message
 * - Should extract and parse JSON from text record
 * - Should return parsed object
 */
export async function testNdefRead() {
  try {
    // Request NDEF technology
    await NfcManager.requestTechnology([NfcTech.Ndef]);

    // Get tag data
    const tag = await NfcManager.getTag();

    if (!tag || !tag.ndefMessage) {
      throw new Error('Tag does not contain NDEF message');
    }

    // Parse NDEF message
    const message = Ndef.parse(tag.ndefMessage);

    // Extract JSON from text record
    let result: any = {};
    message.forEach((record: any) => {
      if (record.type === 'T') {
        // Text record type
        try {
          result = JSON.parse(record.payload);
        } catch (parseError) {
          console.warn('⚠️ Could not parse text record as JSON:', record.payload);
          result = { rawPayload: record.payload };
        }
      }
    });

    console.log('✅ NDEF Read Success:', {
      recordCount: message.length,
      parsedPayload: result,
      tagId: tag.id
    });

    return result;
  } catch (error) {
    console.error('❌ NDEF Read Failed:', {
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    // CRITICAL: Always cleanup technology request
    await NfcManager.cancelTechnologyRequest();
  }
}

/**
 * Test roundtrip: Write JSON to tag, then read it back
 * Validates complete NDEF JSON serialization/deserialization
 */
export async function testNdefRoundtrip(payload: object) {
  try {
    console.log('🔄 Starting NDEF Roundtrip Test...');

    // Step 1: Write to tag
    console.log('📝 Writing payload to tag...');
    await testNdefWrite(payload);

    // Brief delay for tag to settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 2: Read from tag
    console.log('📖 Reading payload from tag...');
    const readPayload = await testNdefRead();

    // Step 3: Validate roundtrip
    const originalJson = JSON.stringify(payload);
    const roundtripJson = JSON.stringify(readPayload);

    if (originalJson === roundtripJson) {
      console.log('✅ NDEF Roundtrip Success - Payload integrity verified');
      return readPayload;
    } else {
      console.warn('⚠️ NDEF Roundtrip - Payload differs:', {
        original: payload,
        roundtrip: readPayload
      });
      return readPayload;
    }
  } catch (error) {
    console.error('❌ NDEF Roundtrip Failed:', error);
    throw error;
  }
}
