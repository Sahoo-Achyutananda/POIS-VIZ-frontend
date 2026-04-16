export const accordionData = [
  {
    title: 'Part I: Symmetric Key Cryptography',
    subtitle: 'One-Way Functions, PRGs, PRFs, Encryption, and MACs — the Minicrypt Clique',
    link: '/part-1',
    linkText: 'View',
    subItems: [
      { title: 'PA #1 — One-Way Functions & Pseudorandom Generators', description: 'Implement DLP-based and AES-based OWFs, construct a PRG using the HILL hard-core-bit iterative construction, and verify output with NIST SP 800-22 statistical tests (frequency, runs, serial).', link: '/pa1' },
      { title: 'PA #2 — Pseudorandom Functions via GGM Tree', description: 'Build a PRF from a PRG using the GGM binary tree construction. Each query follows a root-to-leaf path defined by input bits. Includes an AES plug-in alternative and a distinguishing game demo.', link: '/pa2' },
      {
        title: 'PA #3 — CPA-Secure Symmetric Encryption',
        description: 'Implement the Enc-then-PRF scheme C = ⟨r, Fk(r) ⊕ m⟩ with fresh randomness per encryption. Includes multi-block counter extension, IND-CPA game simulation, and a broken deterministic variant demonstrating the attack.',
        children: [
          {
            title: 'CPA Basics Visualizer',
            description: 'Interactive encryption/decryption walkthrough for Enc(k,m) = (r, c).',
            link: '/pa3/cpa_basics'
          },
          {
            title: 'IND-CPA Attack Chat Demo',
            description: 'Challenge-oracle game with secure mode and nonce-reuse attack mode.',
            link: '/pa3/cpa_attack'
          }
        ]
      },
      { title: 'PA #4 — Modes of Operation', description: 'Implement CBC, OFB, and Randomized CTR modes for arbitrary-length messages using your own block cipher. Includes attack demos for IV-reuse in CBC and keystream-reuse in OFB, with a unified Encrypt(mode, k, M) API.', link: '/pa4' },
      {
        title: 'PA #5 — Message Authentication Codes',
        description: 'Implement PRF-MAC (fixed-length), CBC-MAC (variable-length), and an HMAC stub. Includes an EUF-CMA forgery game and a length-extension attack demonstration on the naive H(k‖m) construction.',
        children: [
          { title: 'MAC Basics (PRF vs CBC)', description: 'Explore fixed-length and variable-length MACs.', link: '/pa5/basics' },
          { title: 'EUF-CMA Forgery Game', description: 'Attack the CBC-MAC by attempting to forge a valid tag.', link: '/pa5/euf_cma_game' },
          { title: 'Length Extension Attack', description: 'Demonstrate naive hash MAC vulnerability.', link: '/pa5/length_extension' }
        ]
      },
      {
        title: 'PA #6 — CCA-Secure Symmetric Encryption',
        description: 'Implement Encrypt-then-MAC combining PA #3 and PA #5 with independent keys kE and kM. Includes IND-CCA2 game simulation and a malleability attack demo contrasting CPA-only vs CCA-secure schemes.',
        children: [
          { title: 'Basics of CCA', description: 'Explore Encrypt-then-MAC basics.', link: '/pa6/basics' },
          { title: 'Malleability Attack', description: 'Interactive bit-flip attack on CPA vs CCA.', link: '/pa6/malleability' },
          { title: 'IND-CCA Simulation', description: 'Challenge-oracle game for CCA2 security.', link: '/pa6/cca_game' }
        ]
      }
    ]
  },
  {
    title: 'Part II: Hashing and Data Integrity',
    subtitle: 'Merkle-Damgård, DLP-Based CRHF, Birthday Attacks, and HMAC',
    link: '/part-2',
    linkText: 'Explore',
    subItems: [
      { 
        title: 'PA #7 — Merkle-Damgård Transform', 
        description: 'Implement a generic MerkleDamgard(compress, IV, block_size) framework accepting any compression function. Includes MD-strengthening padding and XOR-based compression.',
        children: [
          { title: 'Interactive Chain Viewer', description: 'Explore the full process of padding, chunking, and chaining with real-time avalanche visualization.', link: '/pa7/md_chain' },
          { title: 'Collision Propagation Demo', description: 'Demonstrate mathematically that a collision in the compression function leads to a collision in the full hash.', link: '/pa7/collision' }
        ]
      },
      { 
        title: 'PA #8 — DLP-Based Collision-Resistant Hash Function', 
        description: 'Instantiate a provably collision-resistant compression function h(x,y) = g^x · ĥ^y mod p using a safe-prime group where DLP is hard. Plug into PA #7 to produce a full CRHF, with a birthday-bound collision demo.', 
        link: '/pa8/dlp_hash' 
      },
      { title: 'PA #9 — Birthday Attack (Collision Finding)', description: 'Implement both naive sort-based and Floyd cycle-detection birthday attacks. Run on truncated DLP hash with n ∈ {8,10,12,14,16} output bits, plot empirical vs theoretical collision curves, and confirm O(2^(n/2)) behaviour.', link: '/pa9/birthday' },
      { title: 'PA #10 — HMAC and HMAC-Based CCA-Secure Encryption', description: 'Implement HMAC over your PA #8 DLP hash with correct key padding and constant-time verification. Demonstrate length-extension attack failure, rebuild CCA-secure Encrypt-then-HMAC, and prove the CRHF ↔ MAC bidirectional equivalence.', link: '/pa/10' }
    ]
  },
  {
    title: 'Part III: Public-Key Cryptography',
    subtitle: 'Cryptomania — DH, RSA, ElGamal, Digital Signatures, and CCA-Secure PKC',
    link: '/part-3',
    linkText: 'Explore',
    subItems: [
      { title: 'PA #11 — Diffie-Hellman Key Exchange', description: 'Generate safe primes and implement the full DH protocol between Alice and Bob over Z*p. Includes a Man-in-the-Middle attack demonstration by Eve and a CDH hardness brute-force demo on small parameters.', link: '/pa/11' },
      { title: 'PA #12 — Textbook RSA & PKCS#1 v1.5', description: 'Implement RSA key generation using Miller-Rabin, textbook encryption/decryption with square-and-multiply, and PKCS#1 v1.5 padding. Includes a determinism attack demo and a simplified Bleichenbacher padding oracle attack.', link: '/pa/12' },
      { title: 'PA #13 — Miller-Rabin Primality Testing', description: 'Implement the Miller-Rabin probabilistic primality test with k rounds (error ≤ 4^(-k)). Includes prime generation, a Carmichael number demo (561 passes Fermat but fails Miller-Rabin), and performance benchmarks at 512/1024/2048 bits.', link: '/pa/13' },
      { title: 'PA #14 — Chinese Remainder Theorem & Breaking Textbook RSA', description: 'Implement the CRT solver and Garner\'s algorithm for 4× faster RSA decryption. Implement Håstad\'s broadcast attack recovering plaintext from e=3 ciphertexts sent to different recipients using CRT and integer cube roots.', link: '/pa/14' },
      { title: 'PA #15 — Digital Signatures', description: 'Implement hash-then-sign RSA signatures: σ = H(m)^d mod N, verified as σ^e mod N = H(m). Includes EUF-CMA game, a multiplicative homomorphism forgery attack on raw unsigned RSA, and an optional ElGamal/Schnorr signature variant.', link: '/pa/15' },
      { title: 'PA #16 — ElGamal Public-Key Cryptosystem', description: 'Implement ElGamal key generation, encryption C = (g^r, m·h^r), and decryption over your PA #11 group. Includes a malleability attack demo showing (c1, 2c2) decrypts to 2m, and an IND-CPA game with DDH hardness analysis.', link: '/pa/16' },
      { title: 'PA #17 — CCA-Secure Public-Key Cryptography', description: 'Implement Signcryption (Encrypt-then-Sign) combining PA #16 ElGamal and PA #15 signatures. Verify-then-Decrypt rejects any tampered ciphertext before decryption, achieving IND-CCA2 security with a full end-to-end lineage trace.', link: '/pa/17' }
    ]
  },
  {
    title: 'Part IV: Secure Multi-Party Computation',
    subtitle: 'Oblivious Transfer, Secure Gates, and All 2-Party MPC via Yao/GMW',
    link: '/part-4',
    linkText: 'Explore',
    subItems: [
      { title: 'PA #18 — Oblivious Transfer', description: 'Implement 1-out-of-2 OT using the Bellare-Micali protocol over your own PA #16 ElGamal or PA #12 RSA. Receiver learns m_b without revealing b; sender learns nothing about b. Includes receiver/sender privacy demonstrations.', link: '/pa/18' },
      { title: 'PA #19 — Secure AND Gate', description: 'Implement Secure AND from OT (Alice sends (0,a), Bob chooses b, receives a∧b), Secure XOR via additive secret sharing (free, no OT needed), and Secure NOT locally. Verify all four input combinations across 50 runs.', link: '/pa/19' },
      { title: 'PA #20 — All 2-Party Secure Computation (Yao/GMW)', description: 'Build a boolean circuit evaluator using PA #19 gates and securely evaluate three circuits: Millionaire\'s Problem (x>y), secure equality test (x=y), and secure bit-addition (x+y). Full call-stack trace from MPC gate down to Miller-Rabin required.', link: '/pa/20' }
    ]
  }
]