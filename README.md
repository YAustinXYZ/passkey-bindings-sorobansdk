# Passkey Bindings & Soroban SDK Integration

This project provides passkey authentication bindings, Stellar SDK integration, and NFC support for React Native/Expo with Next.js.

## C05 Deliverable: Technical Research & Architecture Decision Records

### Architecture Decisions (Aprobados)

| ADR | Decisión | Estado | Spike Code | CLI Coverage |
|-----|----------|--------|-----------|--------------|
| [ADR-001: Passkey Library Selection](./docs/adr-passkey-library.md) | react-native-passkey@3.5.0 | ✅ Aprobado | [passkey-spike.ts](./src/features/auth/services/passkey-spike.ts) | CLI-013 |
| [ADR-002: Stellar SDK Integration](./docs/adr-stellar-sdk.md) | @stellar/stellar-sdk@16.0.1 + polyfills | ✅ Aprobado | [stellar-spike.ts](./src/features/wallet/services/stellar-spike.ts) | CLI-027 |
| [ADR-003: NFC Manager Integration](./docs/adr-nfc-library.md) | react-native-nfc-manager@3.17.2 | ✅ Aprobado | [nfc-spike.ts](./src/features/nfc/services/nfc-spike.ts) | CLI-045 |

**Notas de Coordinación:**
- Todas las dependencias están pinneadas a versiones exactas (sin `^` o `~`) para reproducibilidad
- Todos los spike services están marcados con `// SPIKE ONLY` y aislados en `src/features/*/services/`
- Cada ADR incluye validación reproducible, límites de plataforma, y planes de rollback
- Dependencias afectadas: S08, S09, S10, S11, S12, S13 (ver ADRs para detalles)

## Tech Stack

### Core Dependencies
- **React Native / Expo SDK 56.0.12** - Cross-platform mobile framework
- **Next.js 16.1.6** - Web framework (si aplica)
- **React 19.2.3** - UI library
- **TypeScript 5** - Type safety

### C05 Research Libraries (Pinned Versions)

#### Passkey Authentication (CLI-013)
```json
{
  "react-native-passkey": "3.5.0",
  "react-native-get-random-values": "2.0.0"
}
```

#### Stellar SDK (CLI-027)
```json
{
  "@stellar/stellar-sdk": "16.0.1",
  "buffer": "6.0.3",
  "react-native-get-random-values": "2.0.0",
  "react-native-url-polyfill": "3.0.0",
  "process": "0.11.10",
  "stream": "0.0.3"
}
```

#### NFC Integration (CLI-045)
```json
{
  "react-native-nfc-manager": "3.17.2"
}
```

## Platform Support

| Platform | Min Version | Passkey | Stellar | NFC |
|----------|------------|---------|---------|-----|
| iOS      | 15.0+      | ✅ Face ID / Touch ID | ✅ HTTPS + polyfills | ✅ Foreground |
| Android  | API 28+    | ✅ Biometric | ✅ HTTPS + polyfills | ✅ Foreground/Background |

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
passkey-bindings-sorobansdk/
├── docs/
│   ├── adr-passkey-library.md       # Passkey library decision
│   ├── adr-stellar-sdk.md           # Stellar SDK decision
│   └── adr-nfc-library.md           # NFC library decision
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   └── services/
│   │   │       └── passkey-spike.ts # Passkey PoC
│   │   ├── wallet/
│   │   │   └── services/
│   │   │       └── stellar-spike.ts # Stellar PoC
│   │   └── nfc/
│   │       └── services/
│   │           └── nfc-spike.ts     # NFC PoC
│   ├── app/
│   └── components/
├── app.config.ts                     # Expo configuration with plugins
├── TESTING.md                        # Manual device validation guide
├── package.json                      # Dependencies (all pinned)
└── README.md                         # This file
```

## Security Notes

⚠️ **SPIKE CODE ONLY** - All research code is isolated and marked `// SPIKE ONLY`:
- Never use passkey secrets in production without server-side validation
- Never expose Stellar private keys
- Always validate NFC payloads server-side before processing

## Learn More

- [Passkey (WebAuthn) Spec](https://www.w3.org/TR/webauthn-2/)
- [Stellar SDK Docs](https://developers.stellar.org/)
- [NFC Data Exchange Format](https://nfcpy.readthedocs.io/en/latest/overview.html)
- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev/)

## Contributing

For detailed implementation guidance, refer to the ADR documents in the `docs/` directory.

## License

See [LICENSE](./LICENSE) file for details..

