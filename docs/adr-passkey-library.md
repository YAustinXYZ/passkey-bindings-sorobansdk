# ADR-001: Selección de Librería Passkey para Autenticación

## Estado
**Aprobado** (Decisión Final)

## Contexto
Se necesita integrar autenticación sin contraseña (passkey) en la aplicación React Native/Expo para los casos de uso CLI-013 (registro y autenticación biométrica). Las opciones evaluadas incluyen react-native-passkey y expo-local-authentication.

## Criterios de Decisión
- Compatibilidad con Expo SDK 56.0.12 y React Native 0.72.8
- Soporte para biometría (Face ID/Touch ID en iOS, Android biometric en Android)
- Capacidad de generar y validar desafíos de autenticación
- Capacidad de rollback a solución alternativa sin romper aplicación
- Documentación clara de limitaciones y requisitos de plataforma

## Opciones Evaluadas

### 1. react-native-passkey@3.5.0
**Ventajas:**
- APIs específicas para passkeys (Passkey.create(), Passkey.get())
- Soporte completo para biometría en ambas plataformas
- Respuestas estructuradas (attestation, assertion) compatibles con WebAuthn

**Desventajas:**
- No compatible con Expo managed client; requiere custom dev client o bare workflow
- Requiere configuración de Associated Domains (iOS) y Digital Asset Links (Android)
- Mayor complejidad de setup en producción

### 2. expo-local-authentication
**Ventajas:**
- Compatible con Expo managed client
- Setup más simple
- Documentación oficial de Expo

**Desventajas:**
- Solo biometría local, no true passkeys
- No genera estructuras WebAuthn
- No permite delegación a servidor para validación

## Decisión Final
**Seleccionado: react-native-passkey@3.5.0**

Se elige react-native-passkey por su capacidad de generar true passkeys con respuestas WebAuthn compatibles para delegación servidor. Aunque requiere custom dev client, la capacidad de validación servidor-side (crucial para CLI-013) justifica la complejidad adicional.

## Versiones Pinneadas
```json
"react-native-passkey": "3.5.0"
```
**Nota:** Sem versión exacta sin ^ o ~ para reproducibilidad en spike.

## Limitaciones Conocidas

### Limitación 1: Incompatibilidad con Expo Managed Client
- **Impacto:** Requiere custom dev client o migración a bare workflow para producción
- **Mitigación:** Durante spike, usar Expo dev client local; documentar requisito antes de merge

### Limitación 2: Configuración de Asociación de Dominio
- **iOS:** Requiere Associated Domains entitlement (.well-known/apple-app-site-association)
- **Android:** Requiere Digital Asset Links (assetlinks.json en .well-known/)
- **Mitigación:** Documentar setup completo en README; validar en pre-producción

### Limitación 3: Biometría Opcional
- **Impacto:** Usuario puede saltarse biometría si la acepta en el dispositivo
- **Mitigación:** Implementar validación servidor-side de tipo de autenticador (CLI-S10)

## Matriz de Plataforma

| Plataforma | Min Version | Biometría | Associated Domain | Status |
|-----------|-------------|-----------|-------------------|--------|
| iOS       | 15.0+       | Face ID / Touch ID | Requerido | ✅ Soportado |
| Android   | API 28+     | Android Biometric | Digital Asset Links | ✅ Soportado |

## Polyfills y Dependencias
```json
"react-native-get-random-values": "2.0.0"
```
**Propósito:** Suministrar crypto.getRandomValues() para generación de challengers.

## Plan de Rollback
1. **Corto plazo (spike):** Mantener Passkey.create() y Passkey.get() pero no usar en login crítico
2. **Mediano plazo:** Si configuración de Associated Domains falla, migrar a expo-local-authentication para biometría local únicamente
3. **Largo plazo:** Si bare workflow no viable, evaluar soluciones de passkey basadas en servidor (FIDO2 server-assisted)

## Restricciones de Seguridad
- ❌ **NUNCA** almacenar secretos privados en cliente después de Passkey.get()
- ❌ **NUNCA** confiar en deviceKey del cliente sin validación servidor
- ✅ **SIEMPRE** validar assertion en servidor (firma, timestamp, origin)
- ✅ **SIEMPRE** generar challenging en servidor, no en cliente

## Amenazas y Mitigaciones

| Amenaza | Severidad | Mitigación |
|---------|-----------|-----------|
| Biometría spoofable en algunos dispositivos | MEDIA | Validación servidor-side de authenticatorAttachment |
| Associated Domains misconfigured | ALTA | Documentar setup; validar en CI/CD pre-deployment |
| Client-side assertion tampering | ALTA | Validación de firma en servidor; nunca confiar cliente |

## Evidencia Reproducible

### PoC: Spike Code
**Archivo:** `src/features/auth/services/passkey-spike.ts`

```typescript
// SPIKE ONLY
import Passkey from 'react-native-passkey';
import { Buffer } from 'buffer';
import 'react-native-get-random-values';

export async function testPasskeyRegistration() {
  try {
    const challenge = Buffer.from('test-challenge-' + Date.now());
    const response = await Passkey.create({
      challenge: challenge.toString('base64'),
      userId: 'test-user-id',
      userName: 'testuser',
      displayName: 'Test User'
    });
    console.log('✅ Passkey Registration Success:', {
      id: response.id,
      type: response.type,
      transports: response.transports,
      attestationObject: response.response?.attestationObject ? 'present' : 'missing'
    });
    return response;
  } catch (error) {
    console.error('❌ Passkey Registration Failed:', error);
    throw error;
  }
}

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
      clientDataJSON: response.response?.clientDataJSON ? 'present' : 'missing'
    });
    return response;
  } catch (error) {
    console.error('❌ Passkey Authentication Failed:', error);
    throw error;
  }
}
```

**Resultado esperado:**
- Registration: respuesta JSON con id, type, transports, attestationObject
- Authentication: respuesta JSON con id, authenticatorAttachment, signature, clientDataJSON
- Crash: Ninguno en Expo dev client con custom dev client instalado

## Dependencias Afectadas
- **S10:** Validación de passkey en servidor (WebAuthn verification)
- **S11:** Almacenamiento de credenciales de usuario post-registro
- **CLI-013:** Cierre de caso de uso de autenticación biométrica

## Referencias
- [react-native-passkey](https://github.com/MobileReality/react-native-passkey)
- [WebAuthn Spec](https://www.w3.org/TR/webauthn-2/)
- [Expo Custom Dev Client](https://docs.expo.dev/develop/development-builds/introduction/)
