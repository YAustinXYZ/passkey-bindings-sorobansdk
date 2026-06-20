# C05 Testing Guide — Manual Device Validation

Este documento contiene los pasos reproducibles para validar cada PoC en devices físicos iOS y Android.

## Pre-requisitos

- **iOS:** iPhone con iOS 15.0+, Xcode instalado, certificados de desarrollo
- **Android:** Device/emulator con Android API 28+, Android Studio
- **Repository:** Clone actualizado con todos los spike services
- **Environment:** Expo SDK 56.0.12, custom dev client instalado en devices

## CLI-013: Passkey Registration & Authentication

### Device Setup
```bash
cd passkey-bindings-sorobansdk
eas build --platform ios --profile development  # Genera custom dev client iOS
eas build --platform android --profile development  # Genera custom dev client Android
# O importa los builds pre-compilados en device
```

### Test Flow: testPasskeyRegistration()

**iOS:**
1. Abre app en iPhone
2. Navega a pantalla de test (si existe) o ejecuta desde console
3. Llama: `await testPasskeyRegistration()`
4. **Esperado:**
   - Prompt de Face ID / Touch ID aparece
   - Respuesta JSON con `id`, `type`, `transports`, `attestationObject` en console
   - ✅ Sin crash
5. **Captura:**
   - Screenshot del prompt biométrico
   - Log completo de respuesta en console

**Android:**
1. Abre app en device Android
2. Llama: `await testPasskeyRegistration()`
3. **Esperado:**
   - Prompt de biometría (fingerprint/face) aparece
   - Respuesta JSON con estructura WebAuthn válida
   - ✅ Sin crash
4. **Captura:**
   - Screenshot del prompt
   - Log de respuesta

### Test Flow: testPasskeyAuthentication()

**iOS:**
1. Después de registration exitosa, llama: `await testPasskeyAuthentication()`
2. **Esperado:**
   - Face ID / Touch ID prompt
   - Respuesta JSON con `signature`, `clientDataJSON`, `authenticatorAttachment`
   - ✅ Sin crash
3. **Validar:**
   - `authenticatorAttachment` debe ser `'platform'` (biométrico) o `'cross-platform'`

**Android:**
1. Llama: `await testPasskeyAuthentication()`
2. **Esperado:**
   - Prompt de biometría
   - Respuesta con estructura válida
   - ✅ Sin crash

### Acceptance: Passkey PoC
- [ ] Registration ejecuta en iOS sin crash
- [ ] Registration ejecuta en Android sin crash
- [ ] Authentication ejecuta en iOS sin crash
- [ ] Authentication ejecuta en Android sin crash
- [ ] Ambas plataformas retornan structuras WebAuthn válidas

---

## CLI-027: Stellar SDK & Keypair Generation

### Device Setup
```bash
# Asegurar que polyfills se cargan en orden correcto
npm install  # Reinstalar con versiones pinneadas
```

### Test Flow: testKeypairGeneration()

**iOS:**
1. Abre app en iPhone
2. Llama: `const pair = await testKeypairGeneration()`
3. **Esperado:**
   - Genera keypair sin crash
   - Console log con `publicKey` (G-prefix), `secretPrefix` (S-), `canSign: true`
   - ✅ Sin timeout o error de polyfill
4. **Validar:**
   - publicKey comienza con `G` (Stellar mainnet/testnet account)
   - secret comienza con `S` (Stellar secret seed)

**Android:**
1. Llama: `const pair = await testKeypairGeneration()`
2. **Esperado:**
   - Mismo comportamiento que iOS
   - ✅ Sin crash

### Test Flow: testHorizonQuery()

**Requiere:** publicKey válido (usar generado arriba)

**iOS:**
1. Llama: `await testHorizonQuery(publicKey)` con publicKey desde PoC anterior
2. **Esperado:**
   - Consulta https://horizon-testnet.stellar.org sin error
   - Retorna JSON con `id`, `sequence`, `balances`
   - Console log con array de balances
   - ✅ Sin error de URL polyfill
3. **Validar:**
   - `id` matches publicKey consultado
   - `sequence` es número válido (≥ 0)
   - `balances` puede ser array vacío o con items

**Android:**
1. Llama: `await testHorizonQuery(publicKey)`
2. **Esperado:**
   - Mismo comportamiento que iOS
   - ✅ Sin timeout

### Acceptance: Stellar PoC
- [ ] Keypair generation ejecuta en iOS sin crash
- [ ] Keypair generation ejecuta en Android sin crash
- [ ] Horizon query ejecuta en iOS sin timeout/polyfill error
- [ ] Horizon query ejecuta en Android sin error
- [ ] Respuesta de Horizon contiene `id`, `sequence`, `balances`

---

## CLI-045: NFC NDEF Read/Write Roundtrip

### Device Setup

**iOS (iPhone con NFC):**
- Requiere iOS 15.0+ + device con NFC hardware (XS, 11, 12, 13, 14, 15+)
- Entitlements ya configurados en `app.config.ts`

**Android (Device con NFC):**
- Requiere API 28+ + NFC hardware
- Permisos ya configurados en `app.config.ts`

### Test Hardware
- **2 NTAG213 o NTAG215 tags** (NFC Forum Type 2, NDEF compatible)
- Costo: ~$1-2 USD por tag en Amazon/AliExpress

### Test Flow: testNdefWrite()

**iOS:**
1. Abre app en iPhone
2. Prepara tag #1 (vacío o con viejo data)
3. Llama: `await testNdefWrite({test: 'payload', timestamp: Date.now()})`
4. **Prompt esperado:** "Hold iPhone near tag to write"
5. Toca tag con trasera de iPhone
6. **Esperado:**
   - Éxito: Console log con `payloadSize: XXX bytes`
   - ✅ Sin crash
   - Tag contiene JSON escrito
7. **Captura:** Screenshot del prompt

**Android:**
1. Abre app en device Android
2. Prepara tag #1
3. Llama: `await testNdefWrite({test: 'payload', timestamp: Date.now()})`
4. **Esperado:**
   - Prompt "Scan tag"
   - Toca tag con NFC reader
   - Éxito: Console log con `payloadSize`
   - ✅ Sin crash

### Test Flow: testNdefRead()

**iOS:**
1. Llama: `await testNdefRead()`
2. **Prompt esperado:** "Hold iPhone near tag to read"
3. Toca tag #1 (el que escribimos arriba)
4. **Esperado:**
   - Éxito: Console log con payload JSON parseado
   - `recordCount: 1`
   - Objeto JSON con `test: 'payload'` + timestamp
   - ✅ Sin crash
5. **Validar:** Payload matches lo que escribimos

**Android:**
1. Llama: `await testNdefRead()`
2. **Esperado:**
   - Toca tag #1
   - Éxito: Payload JSON en console
   - Matches lo escrito

### Test Flow: testNdefRoundtrip()

**iOS:**
1. Prepara tag #2 (vacío)
2. Llama: `await testNdefRoundtrip({payment: 'v1', amount: '100.00', currency: 'XLM'})`
3. **Pasos internos:**
   - Write: "Hold near tag" → toca tag
   - Read: Espera 500ms → "Hold near tag" → toca mismo tag
4. **Esperado:**
   - Ambas operaciones exitosas
   - Payload integrity verified en console
   - ✅ Sin crash
5. **Captura:** Console logs de write + read

**Android:**
1. Prepara tag #2
2. Llama: `await testNdefRoundtrip({payment: 'v1', amount: '100.00', currency: 'XLM'})`
3. **Esperado:**
   - Mismo flujo que iOS
   - ✅ Sin crash

### Acceptance: NFC PoC
- [ ] NDEF write ejecuta en iOS sin crash
- [ ] NDEF write ejecuta en Android sin crash
- [ ] NDEF read ejecuta en iOS y recupera payload correcto
- [ ] NDEF read ejecuta en Android y recupera payload correcto
- [ ] Roundtrip exitoso en al menos un device (iOS o Android)
- [ ] Payload size <= 1600 bytes validado en logs

---

## Validation Checklist

### Passkey (CLI-013)
```
iOS:
  [ ] Biometric prompt appears and responds
  [ ] Registration response has valid WebAuthn structure
  [ ] Authentication response has valid signature
  [ ] No crashes or unhandled exceptions
  
Android:
  [ ] Biometric prompt appears and responds
  [ ] Registration response matches iOS structure
  [ ] Authentication response matches iOS structure
  [ ] No crashes or unhandled exceptions
```

### Stellar (CLI-027)
```
iOS:
  [ ] Keypair.random() returns valid G/S prefixes
  [ ] Horizon query completes without timeout
  [ ] Response has id, sequence, balances fields
  [ ] No polyfill errors in console
  
Android:
  [ ] Keypair generation matches iOS
  [ ] Horizon query completes without timeout
  [ ] Response structure matches iOS
  [ ] No polyfill errors
```

### NFC (CLI-045)
```
iOS (if has NFC):
  [ ] Write succeeds and tag contains data
  [ ] Read retrieves exact payload written
  [ ] Roundtrip payload matches original
  [ ] Payload size logged and < 1600 bytes
  
Android:
  [ ] Write succeeds and tag contains data
  [ ] Read retrieves exact payload written
  [ ] Roundtrip payload matches original
  [ ] Payload size logged and < 1600 bytes
```

---

## Troubleshooting

### Passkey: "Platform not supported"
- **iOS:** Verify custom dev client is installed (not managed Expo client)
- **Android:** Verify custom dev client is installed; biometric auth system may need configuration in device settings

### Stellar: "crypto.getRandomValues is not a function"
- **Fix:** Asegura que `import 'react-native-get-random-values'` está en top del archivo
- **Fix:** Rebuild app después de cambios en imports

### Stellar: "URL is not a function"
- **Fix:** Verificar que `import 'react-native-url-polyfill/auto'` está ANTES de cualquier import de Stellar
- **Fix:** Limpiar cache: `npm run build:clean && npm install`

### NFC: "NFC Not Supported"
- **iOS:** Device debe ser iPhone XS+ (tener NFC hardware)
- **Android:** Device debe tener NFC; habilitarlo en Settings > Connected devices > NFC

### NFC: "Tag is not NDEF compatible"
- **Fix:** Usa tag NTAG213 o NTAG215 (no trabajas con tags ISO-DEP o otros formatos)
- **Fix:** Asegura que tag está limpio/vacío antes de write test

---

## Documentation of Results

Después de ejecutar todos los tests, crear un archivo `TESTING_RESULTS.md` con:

```markdown
# C05 Testing Results

## Device Info
- iOS: iPhone XS, iOS 15.4
- Android: Pixel 4, API 30

## Passkey (CLI-013)
- [ ] iOS registration: ✅ / ❌ (screenshot/logs)
- [ ] iOS authentication: ✅ / ❌
- [ ] Android registration: ✅ / ❌
- [ ] Android authentication: ✅ / ❌

## Stellar (CLI-027)
- [ ] iOS keypair gen: ✅ / ❌ (pubkey: ...)
- [ ] iOS horizon query: ✅ / ❌ (account ID: ...)
- [ ] Android keypair gen: ✅ / ❌
- [ ] Android horizon query: ✅ / ❌

## NFC (CLI-045)
- [ ] iOS write: ✅ / ❌ (size: XXX bytes)
- [ ] iOS read: ✅ / ❌ (payload matched: yes/no)
- [ ] Android write: ✅ / ❌
- [ ] Android read: ✅ / ❌

## Notes
...
```

Commit este archivo a la rama para evidencia de testing.

---

## Next Steps

1. **Si todos los tests pasan:** ✅ C05 ready for PR merge
2. **Si algunos fallan:** Crear GitHub issues con reproducción steps
3. **Si library incompatible:** Actualizar ADR con alternativa y re-test
