type Action = (context: string) => string;

class Thought {
  private actionResult: string;
  private thought: string;

  static fromQuestion(question: string) {
    return new Thought(question);
  }

  constructor(private question: string) {}

  think(thought: string) {
    this.thought = thought;
    return this;
  }

  act(action: Action) {
    const actionContext = this.question + this.thought;
    this.actionResult = action(actionContext);

    return this;
  }

  observe() {
    console.log(this.actionResult);
    return this;
  }

  finalAnswer() {
    console.log(this.actionResult);
  }
}

const arxivSearch: (query: string) => Action = () => () => "";
const deduction: () => Action = () => () => "";
const hypothesize: () => Action = () => () => "";
const induction: () => Action = () => () => "";
const uxDBResearch: (query: string) => Action = () => () => "";
const webSearch: (query: string) => Action = () => () => "";

/** Answer the following question as best as you can. You have access to the following tools:
 * 1. arxivSearch: Search academic papers. Give this tool only keywords
 * 2. webSearch: Search the internet for general ideas
 * 3. deduction: Get specific conclusions from general ideas
 * 4. hypothesize: Propose an idea that can be validated
 * 5. induction: Get general conclusions from specific observations
 * 6. uxDBResearch: Search usability issues and solultions for any Microsoft product. Give this tool only keywords
 * use the following format
 * Thought.fromQuestion("some question")
 *       .think("thought of what to do")
 *       .action(someAction("some input"))
 *       .observe()
 *        /**
 *         * Output:
 *         * Detailed output of the action
 *         /
 *       .think("...")
 *       .action(someOtherAction("..."))
 *       .observe()
 *        // this think().action().observe() pattern can be repeated as many times as you want
 *       .finalAnswer()
 *       /**
 *        * Output
 *        * Final answer to the original question
 *        /
 */
Thought.fromQuestion("How to sustain Nuclear fusion?")
  .think("I will search arxiv for papers on nuclear fusion")
  .act(arxivSearch("nuclear fusion"))
  .observe()
  /**
   * Output:
   * Paper 1: D-Mag: a laboratory for studying plasma physics and diagnostics in strong magnetic fields
   * We have set up a diagnostic magnet (D-Mag) laboratory for a wide range of applications in plasma physics. It consists of a superconducting magnet for field strengths of up to 5.9 T. The main purpose is to provide an experimental environment for the development of plasma diagnostics for nuclear fusion studies and the investigation of dusty plasmas in strong magnetic fields. We describe in the article the setup and operation of the D-Mag.
   * Paper 2: Characterization of the breakup channel in the asymmetric systems 40,48Ca+12C at 25 and 40 MeV/nucleon
   * Abstract: An analysis of the asymmetric reactions 40,48Ca+12C at 25 and 40 MeV/nucleon is presented. Data have been collected with six modules of the FAZIA array. The analysis is focused on the breakup channel of sources produced in dissipative collisions, partially corresponding to incomplete fusion processes. The study has been performed both on detected fragments and on some resonances reconstructed by means of particle-fragment correlations, with a focus on the evolution of the breakup channel with the beam energy and the neutron content of the system, looking in particular at the relative velocity between the breakup fragments. Results show that also Carbon fragments reconstructed by means of particle correlations can be in large part interpreted as the light partner of a scission.
   * Paper 3: Examination of promising reactions with 241Am and 244Cm targets for the synthesis of new superheavy elements within the dinuclear system model with a dynamical potential energy surface
   * Abstract: Two actinide isotopes, 241Am and 244Cm, produced and chemically purified by the HFIR/REDC complex at ORNL are candidates for target materials of heavy-ion fusion reaction experiments for the synthesis of new superheavy elements (SHEs) with Z>118. In the framework of the dinuclear system model with a dynamical potential energy surface (DNS-DyPES model), we systematically study the 48Ca-induced reactions that have been applied to synthesize SHEs with Z=112--118, as well as the hot-fusion reactions with 241Am and 244Cm as targets which are promising for synthesizing new SHEs with Z=119--122. Detailed results including the maximal evaporation residue cross section and the optimal incident energy for each reaction are presented and discussed
   * Paper 4: Neutron Skin Thickness Dependence of Astrophysical S-factor
   * Abstract: Background: The density dependence of nuclear symmetry energy is crucial in determining several properties of finite nuclei to the neutron stars with mass ∼ 1.4 M⊙. The values of neutron skin thickness, isovector giant dipole resonances energies and various nuclear reaction cross-sections in asymmetric nuclei have been utilized to determine the slope of symmetry energy (L0) at the saturation density. Recent PREX-II and CREX measurements of neutron skin thickness in 208Pb and 48Ca nuclei yield very different values of L0 which overlap marginally within 90% confidence interval. Purpose: Our objective is to demonstrate the role of symmetry energy on the sub-barrier fusion cross-section and the astrophysical S-factor for asymmetric nuclei. Method: The nucleus nucleus potentials are generated using the double folding model (DFM) for three different nucleon-nucleon interactions. These DFM potentials are used for the calculation of the sub-barrier fusion cross-section and the astrophysical S-factor...
   * Paper 5: Report of the US ITER Research Program Research Needs Workshop
   * Abstract: The US ITER Research Program Basic Research Needs Workshop, held over the course of several months in 2022, sought to identify steps to be taken to both maximize the return of the US investment in ITER construction and operation and to ensure US research priorities on ITER strengthen the domestic program aimed at the development of a fusion pilot plant (FPP).
   */
  .think("I will search the web for general ideas on nuclear fusion")
  .act(webSearch("nuclear fusion"))
  .observe()
  /**
   * Output:
   * Webpage 1: DOE Explains...Nuclear Fusion Reactions | https://www.energy.gov/
   * Nuclear Fusion reactions power the Sun and other stars. In a fusion reaction, two light nuclei merge to form a single heavier nucleus. The process releases ...
   * Webpage 2: Nuclear fusion | https://en.wikipedia.org/
   * Nuclear fusion is a reaction in which two or more atomic nuclei are combined to form one or more different atomic nuclei and subatomic particles (neutrons ...
   * Webpage 3: Nuclear Fusion : WNA | https://world-nuclear.org/
   * Fusion powers the Sun and stars as hydrogen atoms fuse together to form helium, and matter is converted into energy. Hydrogen, heated to very high temperatures ...
   */
  .finalAnswer();
/**
 * Output:
 * Nuclear fusion is a reaction in which two or more atomic nuclei are combined to form one or more different atomic nuclei and subatomic particles. It is sustained by... */
