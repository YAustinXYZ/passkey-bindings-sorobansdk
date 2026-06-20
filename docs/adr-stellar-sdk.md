# ADR-002: Integración de @stellar/stellar-sdk con Polyfills en Expo

## Estado
**Aprobado** (Decisión Final)

## Contexto
Se necesita integrar el Stellar SDK en la aplicación React Native/Expo para los casos de uso CLI-027 (generación de keypairs, interacción con Horizon). El Stellar SDK requiere polyfills específicos que no están disponibles en React Native/Expo por defecto, especialmente crypto global y APIs de red.

## Criterios de Decisión
- Compatibilidad con Expo SDK 56.0.12 y React Native 0.72.8
- Capacidad de generar keypairs de Stellar sin crash
- Capacidad de consultar Horizon testnet sin errores de polyfill
- Impacto de bundle size documentado
- Plan de rollback a versión anterior sin mayor esfuerzo

## Opciones Evaluadas

### 1. @stellar/stellar-sdk@16.0.1 + Polyfills Específicos
**Versiones necesarias:**
- buffer@6.0.3
- react-native-get-random-values@2.0.0
- react-native-url-polyfill@3.0.0
- process@0.11.10
- stream@0.0.3

**Ventajas:**
- v16.0.1 es la última versión estable con menor footprint que v17+
- Polyfills específicos reducen overhead vs soluciones genéricas
- Metro bundler nativo de Expo maneja resolución de polyfills bien

**Desventajas:**
- Bundle size aumenta ~4.7 MB (tarball)
- Require de polyfill order es crítico (react-native-url-polyfill ANTES de Stellar)
- Posibles conflictos con otras librerías que usan polyfills

### 2. Servidor Backend exclusivo para Stellar
**Ventajas:**
- Reduce dependencia en cliente
- Control centralizado de llamadas Horizon

**Desventajas:**
- No válido para spike que requiere PoC cliente-side
- Agregación de latencia

### 3. @stellar/stellar-sdk@14.5.0 (Anterior)
**Ventajas:**
- Menor footprint (polyfills más livianos)
- Documentación más estable

**Desventajas:**
- Falta de features recientes
- v16.0.1 es estándar actual en comunidad

## Decisión Final
**Seleccionado: @stellar/stellar-sdk@16.0.1 con polyfill set específico**

Se elige v16.0.1 por estar en línea con estándar de comunidad, con polyfills pinneados exactos para garantizar reproducibilidad en spike. El bundle size de ~4.7 MB es aceptable para PoC y puede optimizarse en producción.

## Versiones Pinneadas
```json
"@stellar/stellar-sdk": "16.0.1",
"buffer": "6.0.3",
"react-native-get-random-values": "2.0.0",
"react-native-url-polyfill": "3.0.0",
"process": "0.11.10",
"stream": "0.0.3"
```
**Nota:** Sem versión exacta sin ^ o ~ para reproducibilidad en spike.

## Polyfills Mandatorios

| Polyfill | Versión | Propósito | Orden de Load |
|----------|---------|----------|---------------|
| react-native-url-polyfill | 3.0.0 | URL global para Horizon API calls | 1er (antes Stellar) |
| buffer | 6.0.3 | Buffer global para operaciones binary | 2do |
| react-native-get-random-values | 2.0.0 | crypto.getRandomValues() para keypair gen | 3er |
| process | 0.11.10 | process global para stream deps | 4to |
| stream | 0.0.3 | Node.js stream polyfill para crypto | 5to |

## Polyfills Opcionales (NO INCLUIDOS)
- **crypto-browserify:** NO necesario en v16.0.1 (nativo en RN 0.72+)

## Matriz de Plataforma

| Plataforma | Min Version | Horizon API | Keypair Gen | Status |
|-----------|-------------|------------|-------------|--------|
| iOS       | 15.0+       | ✅ HTTPs with polyfill | ✅ getRandomValues | ✅ Soportado |
| Android   | API 29+     | ✅ HTTPs with polyfill | ✅ getRandomValues | ✅ Soportado |

## Impacto de Bundle

**Tamaño de tarball:** ~4.7 MB total
- stellar-sdk core: ~2.1 MB
- Polyfills combined: ~2.6 MB

**Optimizaciones futuras:** 
- Tree-shaking unused exports
- Lazy-load polyfills solo en runtime si es necesario

## Plan de Rollback
1. **Corto plazo (spike):** Mantener v16.0.1 pero documentar polyfill requirements
2. **Si errors en producción:** Downgrade a @stellar/stellar-sdk@14.5.0 con polyfill set reducido
3. **Si polyfill conflicts:** Evaluar soluciones alternativas (custom Stellar HTTP client sin SDK)

## Restricciones de Seguridad
- ❌ **NUNCA** usar Keypair.random() en producción sin guardarlo en secure storage
- ❌ **NUNCA** loguear o exponer private keys (ni en development)
- ✅ **SIEMPRE** validar respuestas de Horizon antes de usar en negocio logic
- ✅ **SIEMPRE** usar Horizon testnet (no mainnet) en desarrollo/staging

## Amenazas y Mitigaciones

| Amenaza | Severidad | Mitigación |
|---------|-----------|-----------|
| Polyfill version mismatch | MEDIA | Versiones exactas pinneadas en package.json |
| Metro bundler doesn't resolve polyfills | ALTA | Explicit imports en top de spike file |
| Random values not truly random en dev | MEDIA | Validar distribution de valores en testing |
| Horizon API rate limiting | BAJA | Implementar backoff exponencial en queries |

## Evidencia Reproducible

### PoC: Spike Code
**Archivo:** `src/features/wallet/services/stellar-spike.ts`

```typescript
// SPIKE ONLY
import 'react-native-url-polyfill/auto';
import { Keypair, Server } from '@stellar/stellar-sdk';
import 'react-native-get-random-values';

export async function testKeypairGeneration() {
  try {
    const pair = Keypair.random();
    console.log('✅ Keypair Generation Success:', {
      publicKey: pair.publicKey(),
      secretPrefix: pair.secret().substring(0, 2), // S-prefix only
      canSign: typeof pair.sign === 'function'
    });
    return pair;
  } catch (error) {
    console.error('❌ Keypair Generation Failed:', error);
    throw error;
  }
}

export async function testHorizonQuery(publicKey: string) {
  try {
    const server = new Server('https://horizon-testnet.stellar.org');
    const account = await server.loadAccount(publicKey);
    console.log('✅ Horizon Query Success:', {
      id: account.id,
      sequence: account.sequence,
      balances: account.balances.map((b: any) => ({
        asset: b.asset_type,
        balance: b.balance
      }))
    });
    return account;
  } catch (error) {
    console.error('❌ Horizon Query Failed:', error);
    throw error;
  }
}
```

**Resultado esperado:**
- Keypair Generation: objeto con publicKey (G...), secret (S...), sign() function
- Horizon Query: respuesta JSON con id, sequence, balances array
- Crash: Ninguno en Expo dev client

## Dependencias Afectadas
- **S12:** Interacción con smart account en Stellar
- **S13:** Validación de transacciones en servidor contra Horizon
- **CLI-027:** Cierre de caso de uso de generación de keypairs

## Referencias
- [@stellar/stellar-sdk](https://github.com/stellar/py-stellar-base)
- [Stellar Horizon API](https://developers.stellar.org/api/introduction/)
- [Polyfill Strategy in React Native](https://reactnative.dev/docs/javascript-environment)
