# Analysis of Malicious Code Dynamics with Target and Attacker Nodes Using a Mathematical Model

**B.Tech Project · ABV-Indian Institute of Information Technology and Management, Gwalior · 2017**

**Authors:** [Alok Singh](https://www.linkedin.com/in/aloks2573/) · [Neha Singh](https://www.linkedin.com/in/neha-singh01/) · [Saurabh Sharma](https://sites.google.com/view/saurabh-sharma/)
**Supervisors:** [Dr. Joydip Dhar](https://www.iiitm.ac.in/staff/faculty/prof-joydip-dhar) · [Dr. Anuraj Singh](https://www.iiitm.ac.in/staff/faculty/dr-anuraj-singh)

🌐 **Project page:** [https://github.com/philsaurabh/B.Tech_Project_and_Thesis](https://github.com/philsaurabh/B.Tech_Project_and_Thesis)
📄 **Report:** [`Final Report.pdf`](https://github.com/philsaurabh/B.Tech_Project_and_Thesis/blob/master/Final%20Report.pdf)

---

## Overview

Malicious code (viruses, worms, Trojans, ransomware) spreads through a computer network much as an infectious disease spreads through a population. This project builds a **seven-compartment epidemiological model** of that spread, with separate sub-models for the **targeted** network and the **attacker** network.

The analysis has three parts:

1. **Qualitative analysis** of the system of ordinary differential equations: boundedness, equilibria, the basic reproduction number $R_0$, and local asymptotic stability.
2. **Numerical simulation and validation** in **MATLAB** (Runge–Kutta–Fehlberg, `ode45`).
3. **Symbolic bridging** of the two in **Mathematica**: solving for equilibria and deriving sensitivity indices.

## The model (SIQR–IBR)

| Side | Compartments |
|---|---|
| **Targeted nodes** | $S_1$ Susceptible · $I_1$ Infected · $Q_1$ Quarantined · $R_1$ Recovered |
| **Attacker nodes** | $I_2$ Infected (latent) · $B_2$ Breaking-out · $R_2$ Recovered |

The design fixes several shortcomings of earlier SIR/SEIRS/SEIQRS/SLBS models:

- **No exposed class.** An attacked machine is infected immediately.
- **Latent and breaking-out infection are separate states.** Breaking-out machines degrade visibly and recover faster.
- **Quarantine exists only on the target side.** Attackers have no reason to isolate their own nodes.
- **No permanent immunity.** Recovered machines can be reinfected by new malware.
- **New attacks fit the structure.** Ransomware-style attacks map onto the attacker's I → B → R → I loop.

Transmission is damped by a **media-coverage (firewall / antivirus) factor**:

$$\beta(I) = \beta\, e^{-mI/N}$$

### Governing equations

**Targeted nodes**

$$
\begin{aligned}
\frac{dS_1}{dt} &= b - d_1 S_1 + \alpha R_1 - \beta_1 e^{-m_1 I_1/N_1}\frac{I_1}{N_1}S_1 - \beta_2 e^{-m_2 B_2/N_2}\frac{B_2}{N_2}S_1\\
\frac{dI_1}{dt} &= \beta_1 e^{-m_1 I_1/N_1}\frac{I_1}{N_1}S_1 + \beta_2 e^{-m_2 B_2/N_2}\frac{B_2}{N_2}S_1 - (d_2+\eta+\mu)I_1\\
\frac{dQ_1}{dt} &= \mu I_1 - (d_2+\lambda_0)Q_1\\
\frac{dR_1}{dt} &= \lambda_0 Q_1 + \eta I_1 - (\alpha+d_1)R_1
\end{aligned}
$$

**Attacker nodes**

$$
\begin{aligned}
\frac{dI_2}{dt} &= b_1 - (d_4+\delta+\eta_1)I_2 + \theta R_2\\
\frac{dB_2}{dt} &= \delta I_2 - (d_4+\gamma)B_2\\
\frac{dR_2}{dt} &= \gamma B_2 + \eta_1 I_2 - (d_3+\theta)R_2
\end{aligned}
$$

Here $N_1 = S_1+I_1+Q_1+R_1$, $N_2 = I_2+B_2+R_2$, and $m_1$, $m_2$ are the antivirus and firewall coefficients. The full parameter glossary is in Chapter 2 of the report.

## Key results

- **Two equilibria.** There is a malicious-code-free state $E_1$ and an endemic state $E_2$.
- **The basic reproduction number sets the outcome.** For the dimensional model,

  $$\tilde R_0 = \frac{\tilde\beta_1}{\tilde d_2 + \tilde\mu + \tilde\eta}$$

  $R_0 < 1$ makes $E_1$ stable (the code dies out). $R_0 > 1$ makes $E_2$ locally asymptotically stable (the code persists).
- **A measurable firewall coefficient.** $m = -\log_2(a + b - ab)$, where $b$ is how incoming data respond to the firewall's rule base and $a$ is the proportion by which propagation is reduced when every file passes the rules.
- **Control lowers the level, not the regime.** $R_0$ does not depend on $m$, so firewall and antivirus coefficients do not change which equilibrium wins, but they reduce the number of infected nodes at steady state.
- **Sensitivity.** Normalised forward sensitivity indices show no highly sensitive parameters. $\tilde\beta_1$, $\tilde d_2$, $\tilde\mu$ and $\tilde\eta$ have moderate influence on $\tilde R_0$.

| Parameter set | Model | $R_0$ | Stable state |
|---|---|---|---|
| A | non-dimensional | 0.0098 | $E_1$ (code-free) |
| B | non-dimensional | 1.25 | $E_2$ (endemic) |
| C | dimensional | 0.4545 | $E_1$ (code-free) |
| D | dimensional | 2.2727 | $E_2$ (endemic) |

## Repository structure

```
.
├── Source Code/
│   ├── MATLAB/
│   │   ├── Normalized.m             # non-dimensional system (parameter sets A, B)
│   │   └── Duimensional.m           # dimensional system (parameter sets C, D)
│   └── Mathematica/
│       ├── malicious free.nb        # full 7-equation system → equilibria
│       ├── attacker.nb              # attacker sub-system, solved analytically
│       ├── Numerical equation.nb    # target sub-system, solved numerically
│       ├── senstivity dimensional.nb
│       ├── senstivity non dimensional.nb
│       └── Readme.txt
├── Final Report/                    # LaTeX source and figures of the report
├── Presentation/                    # Beamer slides (LaTeX)
├── Final Report.pdf
├── index.html, assets/, .nojekyll   # project web page (GitHub Pages)
└── LICENSE
```

## Running the code

**MATLAB** (written for R2013a, works on later versions)

```matlab
cd 'Source Code/MATLAB'
Normalized      % plots S1 I1 Q1 R1 I2 B2 R2 over time for the non-dimensional model
Duimensional    % same for the dimensional model; prints R0
```

To reproduce a figure from the report, change the parameter values, the initial population vector `initial`, or the control coefficients `m1`, `m2` at the top of each file. Setting `m1 = m2 = 0` gives the uncontrolled runs.

**Mathematica** (written for 11.1.1): open the `.nb` notebooks and evaluate them. `malicious free.nb` solves for the equilibria of the full system. The two sensitivity notebooks compute the normalised forward sensitivity indices of $R_0$.

**In the browser:** the [project page](https://philsaurabh.github.io/B.Tech_Project_and_Thesis/#simulator) has an interactive simulator of the dimensional model. It uses fourth-order Runge–Kutta and reproduces the Set C and Set D results.


## Acknowledgements

We thank our supervisors, Dr. Joydip Dhar and Dr. Anuraj Singh, for their guidance throughout the project.

---
## Contact

please contact saurabh_2021cs30@iitp.ac.in for any discrepancy.

---

## License

See [LICENSE](LICENSE).
