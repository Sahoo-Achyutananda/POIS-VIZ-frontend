import React from 'react';

export default function PA6Theory() {
  return (
    <main className="min-h-screen w-full bg-(--bg) px-5 py-6 text-(--text) md:px-4">
      <section className="mx-auto w-full rounded-2xl border-2 border-(--border) bg-(--bg) p-6 shadow-(--shadow)">
        <h1 className="mb-6 text-3xl font-bold text-(--text-h)">PA #6: CCA-Secure Symmetric Encryption</h1>
        
        <div className="space-y-8 text-left">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-(--accent-color)">1. The Need for CCA Security</h2>
            <p className="mb-4 leading-relaxed opacity-90">
              While CPA security (Chosen Plaintext Attack) ensures that an adversary cannot gain information by querying an encryption oracle, it does <strong>not</strong> guarantee that the adversary cannot modify ciphertexts in meaningful ways.
            </p>
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
              <strong className="text-rose-400">The Problem: Malleability.</strong> CPA-only schemes (like Randomized CTR or OFB) are often malleable. An adversary can flip a bit in the ciphertext, and the resulting decrypted plaintext will have the corresponding bit flipped as well. This is dangerous in protocols where bit-positions matter (e.g., changing "PAY $100" to "PAY $900").
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-(--accent-color)">2. Encrypt-then-MAC (EtM)</h2>
            <p className="mb-4 leading-relaxed opacity-90">
              To achieve <strong>Chosen Ciphertext Attack (CCA)</strong> security, we must ensure that any modification to the ciphertext is detected. The most robust construction is <strong>Encrypt-then-MAC</strong>:
            </p>
            <div className="rounded-lg border border-(--border) bg-(--social-bg) p-5 font-mono text-sm leading-relaxed text-(--text-h)">
              <p className="mb-2">Key Generation: Independent keys (kE, kM)</p>
              <p className="mb-2">Encrypt(m) = (c, t) where:</p>
              <ul className="ml-6 list-disc space-y-1 opacity-80">
                <li>c = CPA-Enc(kE, m)</li>
                <li>t = MAC(kM, c)</li>
              </ul>
              <hr className="my-3 border-(--border)" />
              <p className="mb-2">Decrypt(c, t) = </p>
              <ul className="ml-6 list-disc space-y-1 opacity-80">
                <li>If MAC-Vrfy(kM, c, t) is Valid: return CPA-Dec(kE, c)</li>
                <li>Else: return ⊥ (Error)</li>
              </ul>
            </div>
            <p className="mt-4 text-sm italic opacity-80">
              Note: Verification must happen <strong>before</strong> decryption.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-(--accent-color)">3. Key Separation</h2>
            <p className="mb-4 leading-relaxed opacity-90">
              A critical requirement for the security of EtM is that the encryption key (<code>kE</code>) and the MAC key (<code>kM</code>) must be <strong>independent</strong>. Reusing the same key for both roles can lead to subtle cross-primitive interactions that break safety proofs.
            </p>
          </section>

          <section className="rounded-xl border border-(--accent-border) bg-(--accent-bg) p-6">
            <h2 className="mb-2 text-lg font-bold text-(--text-h)">IND-CCA2 Game</h2>
            <p className="text-sm leading-relaxed opacity-90">
              In the IND-CCA2 security game, the adversary is given access to both an <strong>encryption oracle</strong> and a <strong>decryption oracle</strong>. They win if they can distinguish between $E(m_0)$ and $E(m_1)$ even after querying the decryption oracle on any ciphertext <em>other than</em> the challenge ciphertext itself.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
