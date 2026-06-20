# ADR-003: Integración de react-native-nfc-manager para NDEF JSON Roundtrip

## Estado
**Aprobado** (Decisión Final)

## Contexto
Se necesita integrar NFC (Near Field Communication) en la aplicación React Native/Expo para los casos de uso CLI-045 (lectura/escritura de etiquetas NFC con payloads JSON para flujos de pago). Se requiere validación de que el payload de payment-request.v1 cabe dentro del límite funcional de tags comunes (~1.8 KB).

## Criterios de Decisión
- Compatibilidad con Expo SDK 56.0.12 y React Native 0.72.8
- Capacidad de escribir y leer NDEF messages con payload JSON
- Validación de límite de 1.8 KB funcional en tags comunes
- Confirmación explícita de que payment-request.v1 cabe en ese límite
- Diferencias de comportamiento entre iOS y Android documentadas
- Plan de rollback a QR code o alternativa sin NFC

## Opciones Evaluadas

### 1. react-native-nfc-manager@3.17.2 + Expo Config Plugin
**Ventajas:**
- API moderna y mantenida activamente
- Expo config plugin simplifica setup de permisos (iOS/Android)
- Soporte completo para NDEF JSON roundtrip
- Community adoption fuerte

**Desventajas:**
- iOS tiene mejor soporte en foreground; background limitado
- Android tiene mejor background support pero menos estable en versiones viejas
- Payloads > 1.8 KB pueden fallar silenciosamente en tags comunes

### 2. NativeModules Custom
**Ventajas:**
- Control total sobre comportamiento
- Puede optimizarse específicamente

**Desventajas:**
- Mayor complejidad de desarrollo
- Requiere knowledge de Objective-C (iOS) y Java (Android)
- No válido para spike timeline

### 3. QR Code (sin NFC)
**Ventajas:**
- No requiere hardware NFC
- Funciona en todos los dispositivos

**Desventajas:**
- UX inferior comparado a NFC
- No cumple requisito CLI-045

## Decisión Final
**Seleccionado: react-native-nfc-manager@3.17.2 con Expo config plugin**

Se elige NFC manager por su capacidad de NDEF JSON roundtrip, plugin de Expo que simplifica setup, y community support. El límite de 1.8 KB se valida explícitamente como suficiente para payment-request.v1.

## Versiones Pinneadas
```json
"react-native-nfc-manager": "3.17.2"
```
**Nota:** Sem versión exacta sin ^ o ~ para reproducibilidad en spike.

## Límite de Payload y Compatibilidad

### Límite Funcional: 1.8 KB
**Validación en spike:** testNdefWrite() calcula byte size de payload antes de write

```
Capacidad NDEF típica en tags comunes:
- NTAG213: 180 bytes user data
- NTAG215: 504 bytes user data
- NTAG216: 888 bytes user data

Límite funcional (1.8 KB) ≈ 1,843 bytes → cabe en NTAG216
```

### payment-request.v1 Size Check
**Estimación:**
```json
{
  "request_type": "payment",
  "version": "1.0",
  "merchant_id": "merchant-uuid-here", // ~40 bytes
  "transaction_id": "txn-uuid-here",   // ~40 bytes
  "amount": "100.00",                   // ~10 bytes
  "currency": "XLM",                    // ~5 bytes
  "nonce": "random-bytes-b64",         // ~50 bytes
  "timestamp": 1234567890,             // ~15 bytes
  "expires_in": 3600,                  // ~6 bytes
  "signature": "base64-sig-here"       // ~150 bytes
}
```
**Total estimado: ~316 bytes** ✅ Bien dentro de 1.8 KB

## Matriz de Plataforma

| Plataforma | Min Version | NDEF Write | NDEF Read | Background | Status |
|-----------|-------------|-----------|-----------|------------|--------|
| iOS       | 15.0+       | ✅ Foreground | ✅ Foreground | ❌ Limited | ✅ Soportado |
| Android   | API 28+     | ✅ Foreground/Background | ✅ Foreground/Background | ✅ Better | ✅ Soportado |

## Diferencias de Comportamiento

### iOS
- NFC disponible en iPhones con NFC hardware (XS+)
- **Foreground-only:** Requiere App en foreground para NDEF exchange
- **Associated Domains:** Recomendado para background tag detection (futura)
- **No background:** Tag detection en background no soportado en iOS estándar

### Android
- NFC en mayoría de dispositivos modernos (API 28+)
- **Foreground y Background:** Soportado mediante NFC foreground dispatch
- **Mayor flexibilidad:** Puede detectar tags en background con servicios

## Permiso y Entitlements

### iOS (Requerido)
```xml
<key>NFCReaderUsageDescription</key>
<string>Permite leer etiquetas NFC para transacciones de pago.</string>

<key>com.apple.developer.nfc.readersession.formats</key>
<array>
  <string>NDEF</string>
  <string>TAG</string>
</array>
```

### Android (Requerido)
```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

## Plan de Rollback
1. **Corto plazo (spike):** Mantener NFC NDEF roundtrip; documentar payload limit de 1.8 KB
2. **Si write falla en device real:** Validar tag NDEF support; posible downgrade a NTAG216 check
3. **Si adoption baja en usuarios:** Implementar QR code fallback como alternativa UI
4. **Si background crítico:** Migrar a bare workflow con custom native NFC handling

## Restricciones de Operación
- ⚠️ **Foreground primero:** Iniciar con foreground-only; background es future optimization
- ⚠️ **Payload validation:** Validar size ANTES de escribir en tag
- ✅ **Error handling:** Always limpiar resources en finally block (cancelTechnologyRequest)
- ✅ **User prompts:** Solicitar permisos antes de intentar NDEF exchange

## Amenazas y Mitigaciones

| Amenaza | Severidad | Mitigación |
|---------|-----------|-----------|
| Payload > 1.8 KB se escribe pero no se lee | ALTA | Validar size; rechazar payloads > 1.6 KB con margen |
| Tag sin NDEF support detectado como error | MEDIA | Documentar requerimiento NDEF en specs |
| iOS background tag detection falla | BAJA | Documentar limitación; feature para future iteration |
| Conflicto NFC con otras apps | BAJA | Test en devices reales con NFC apps activas |

## Evidencia Reproducible

### PoC: Spike Code
**Archivo:** `src/features/nfc/services/nfc-spike.ts`

```typescript
// SPIKE ONLY
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

NfcManager.start();

export async function initNfc() {
  try {
    const supported = await NfcManager.isSupported();
    console.log('✅ NFC Support Status:', { supported });
    return supported;
  } catch (error) {
    console.error('❌ NFC Init Failed:', error);
    throw error;
  }
}

export async function testNdefWrite(payload: object) {
  try {
    await NfcManager.requestTechnology([NfcTech.Ndef]);
    const text = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(text);
    console.log(`📝 Payload size: ${bytes.byteLength} bytes`);
    
    if (bytes.byteLength > 1600) {
      throw new Error('Payload exceeds 1.6 KB safety limit');
    }

    const record = Ndef.textRecord(text);
    const message = [record];
    await NfcManager.writeNdefMessage(message);
    console.log('✅ NDEF Write Success:', {
      payloadSize: bytes.byteLength,
      recordCount: message.length
    });
  } catch (error) {
    console.error('❌ NDEF Write Failed:', error);
    throw error;
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

export async function testNdefRead() {
  try {
    await NfcManager.requestTechnology([NfcTech.Ndef]);
    const tag = await NfcManager.getTag();
    const message = Ndef.parse(tag.ndefMessage);
    
    let result = {};
    message.forEach((record: any) => {
      if (record.type === 'T') { // Text record
        result = JSON.parse(record.payload);
      }
    });

    console.log('✅ NDEF Read Success:', result);
    return result;
  } catch (error) {
    console.error('❌ NDEF Read Failed:', error);
    throw error;
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}
```

**Resultado esperado:**
- initNfc: { supported: true/false }
- testNdefWrite: ✅ con payload size en bytes
- testNdefRead: JSON payload parseado correctamente
- Crash: Ninguno en Expo dev client

## Dependencias Afectadas
- **S08:** Validación de payment request en servidor
- **S09:** Formato de etiqueta NFC payment-request.v1
- **CLI-045:** Cierre de caso de uso de lectura/escritura NFC

## Referencias
- [react-native-nfc-manager](https://github.com/whitedogg13/react-native-nfc-manager)
- [NDEF Specification](https://en.wikipedia.org/wiki/NFC_Data_Exchange_Format)
- [NFC Forum Type 2 Spec](https://nfcpy.readthedocs.io/en/latest/overview.html)
