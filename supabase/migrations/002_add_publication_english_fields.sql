-- =====================================================================
-- 002: job_publications 英文字段（English Mode 动态内容）
-- 日期：2026-09-20
-- 说明：
--   1. 为 job_publications 增加 4 个可空英文字段；
--   2. 回填全部现有岗位的英文（标题/方向/职级/一句话概述）；
--   3. 展示端约定：英文模式优先读 _en 字段，为空时回落中文原值；
--   4. 本脚本幂等：列用 IF NOT EXISTS，回填为确定性 UPDATE，可重复执行。
-- 执行方式：Supabase Dashboard → SQL Editor（先 dev 库，部署时正式库再执行一次）
-- =====================================================================

alter table job_publications add column if not exists public_title_en text;
alter table job_publications add column if not exists direction_en      text;
alter table job_publications add column if not exists seniority_en      text;
alter table job_publications add column if not exists summary_en        text;

-- ---------------------------------------------------------------------
-- 回填：QJ-26-0001 ~ QJ-26-0075（72 个岗位）
-- ---------------------------------------------------------------------

update job_publications set public_title_en='Quantum OS Engineer (Compilation Optimization)', direction_en='Quantum Software & Compilation', seniority_en='Mid-Senior R&D', summary_en='Compiles and maps high-level quantum circuits to executable instructions across quantum chips, covering routing, gate-level optimization and pulse scheduling.' where public_job_code='QJ-26-0001';

update job_publications set public_title_en='Director of Quantum Computing Algorithms (Computational Chemistry / Simulation)', direction_en='Quantum Applications & Computational Chemistry', seniority_en='Tech Lead / Director', summary_en='Leads quantum chemistry algorithm strategy, team building, B2B platform productization, and enterprise adoption in pharma and materials.' where public_job_code='QJ-26-0002';

update job_publications set public_title_en='Principal Strategic Planning Expert', direction_en='Industry Strategy & Operations', seniority_en='Expert / Lead', summary_en='Develops mid- to long-term strategy and annual business plans across photonic chips, quantum computing and photonic quantum, driving execution from strategy to delivery.' where public_job_code='QJ-26-0003';

update job_publications set public_title_en='Board Secretary', direction_en='Capital Markets & Corporate Governance', seniority_en='Senior Functional Role', summary_en='Owns IPO preparation, financial and legal compliance, investor relations, corporate governance and information disclosure.' where public_job_code='QJ-26-0004';

update job_publications set public_title_en='Packaging Design Engineer', direction_en='Optoelectronics & Advanced Packaging', seniority_en='Senior Engineer', summary_en='Designs co-packaged optics 2.5D/3D packages, performs SI/PI and thermal simulation, and develops flip-chip, fan-out and bumping processes.' where public_job_code='QJ-26-0005';

update job_publications set public_title_en='Femtosecond Laser Engineer', direction_en='Photonic Quantum & Micro-Nano Optics', seniority_en='R&D Engineer', summary_en='Builds femtosecond laser direct-write systems, waveguide and 5D optical storage processes, chip packaging/testing equipment and optical testing.' where public_job_code='QJ-26-0006';

update job_publications set public_title_en='Superconducting Quantum Chip Design Engineer', direction_en='Superconducting Quantum Chips', seniority_en='R&D Engineer', summary_en='Owns superconducting qubit chip architecture, layout, electromagnetic simulation, performance evaluation and test-feedback iteration.' where public_job_code='QJ-26-0007';

update job_publications set public_title_en='Quantum Compiler Engineer', direction_en='Quantum Software & Compilation', seniority_en='Mid-Senior / Staff', summary_en='Develops quantum-classical heterogeneous compiler toolchains spanning SDK/API, IR, LLVM/MLIR, routing/scheduling and end-to-end lowering.' where public_job_code='QJ-26-0008';

update job_publications set public_title_en='FPGA Development Engineer (Mid-Senior)', direction_en='Quantum Control & Hardware Systems', seniority_en='Mid-Senior / Staff', summary_en='Works on RFSoC digital signal processing, JESD/PCIe/LVDS/AXI data paths, RTL-to-system integration and hardware/software co-design.' where public_job_code='QJ-26-0009';

update job_publications set public_title_en='Control Software Engineer', direction_en='Quantum Control & Software Systems', seniority_en='Mid-Senior / Staff', summary_en='Builds device drivers, pulse/gate dispatch, measurement data acquisition, automated calibration and low-latency task scheduling software.' where public_job_code='QJ-26-0010';

update job_publications set public_title_en='Quantum Chemistry Researcher (Materials)', direction_en='Quantum Applications & Computational Materials', seniority_en='Researcher', summary_en='Runs first-principles, electronic-structure, reaction-path and multiscale simulations for catalysis, batteries and functional materials, exploring quantum algorithm mapping.' where public_job_code='QJ-26-0011';

update job_publications set public_title_en='AI Infrastructure Engineer', direction_en='AI Infrastructure & R&D Productivity', seniority_en='Mid-Senior Engineer', summary_en='Builds private LLMs, RAG, agents, MLOps and developer toolchains serving quantum R&D teams.' where public_job_code='QJ-26-0012';

update job_publications set public_title_en='Senior Process Integration Engineer (PIE) - Superconducting Quantum Chips', direction_en='Superconducting Chip Manufacturing', seniority_en='Senior Engineer', summary_en='Owns full-process integration for superconducting quantum chips, TSV/advanced packaging interfaces, yield improvement and failure analysis.' where public_job_code='QJ-26-0013';

update job_publications set public_title_en='Senior RF Engineer', direction_en='Quantum Control & Microwave Engineering', seniority_en='Senior Engineer', summary_en='Owns GHz RF systems, filters, PA/LNA, PCB design, test and validation, and volume-production support.' where public_job_code='QJ-26-0014';

update job_publications set public_title_en='Quantum Hardware Calibration Engineer', direction_en='Quantum Control & Calibration', seniority_en='R&D Engineer', summary_en='Owns superconducting chip characterization, cryogenic control links, physics experiment scripting and automated calibration flows.' where public_job_code='QJ-26-0015';

update job_publications set public_title_en='Heterogeneous Computing Runtime Engineer', direction_en='Quantum Software & Heterogeneous Systems', seniority_en='Senior Engineer', summary_en='Designs CPU/GPU/QPU heterogeneous runtimes connecting compiled artifacts, quantum hardware and HPC/cloud infrastructure.' where public_job_code='QJ-26-0016';

update job_publications set public_title_en='Quantum Chemistry Researcher (Biology)', direction_en='Quantum Applications & Computational Biology', seniority_en='Researcher', summary_en='Performs quantum chemistry modeling of enzyme catalysis, bioreactions and active sites, exploring quantum algorithms and real-hardware validation.' where public_job_code='QJ-26-0017';

update job_publications set public_title_en='Government Relations (GR)', direction_en='Industry Relations & Policy', seniority_en='Senior Functional Role', summary_en='Owns government-relations strategy, science and technology program applications, policy research and industry partnerships across quantum, semiconductors and AI.' where public_job_code='QJ-26-0018';

update job_publications set public_title_en='Embedded Development Engineer', direction_en='Quantum Control & Embedded Systems', seniority_en='Engineer', summary_en='Works on Zynq/RFSoC Linux, drivers, RF instrument software, data paths and volume-production firmware.' where public_job_code='QJ-26-0019';

update job_publications set public_title_en='Quantum Algorithm Researcher', direction_en='Quantum Algorithms & Error Correction', seniority_en='Researcher', summary_en='Owns quantum algorithm theory, quantum error correction, compiler optimization and engineering of core code.' where public_job_code='QJ-26-0020';

update job_publications set public_title_en='Senior Process Engineer (PE)', direction_en='Superconducting Chip Manufacturing', seniority_en='Senior Engineer', summary_en='Develops EBL/DUV, PVD/CVD, RIE/ICP, superconducting thin-film and Josephson-junction processes, with SPC and yield improvement.' where public_job_code='QJ-26-0021';

update job_publications set public_title_en='Investor Relations (IR)', direction_en='Financing & Investor Relations', seniority_en='Senior Functional Role', summary_en='Manages investor networks, underwriting support, roadshows, due diligence, deal closing and capital-markets brand building.' where public_job_code='QJ-26-0022';

update job_publications set public_title_en='Quantum Cloud Platform Engineer', direction_en='Quantum Cloud & Developer Platform', seniority_en='Mid-Senior Engineer', summary_en='Builds quantum job submission, queuing, result delivery, QPU quotas, multi-tenant isolation and web-based quantum experiment environments.' where public_job_code='QJ-26-0023';

update job_publications set public_title_en='Artificial Intelligence Expert', direction_en='AI x Quantum', seniority_en='Expert / Tech Lead', summary_en='Defines the AI technology roadmap, embedding LLMs, RAG, agents and machine learning methods into quantum R&D.' where public_job_code='QJ-26-0024';

update job_publications set public_title_en='Channel Ecosystem Manager (Beijing GR)', direction_en='Industry Ecosystem & Government Relations', seniority_en='Mid-Senior Functional Role', summary_en='Builds ecosystem partnerships with Beijing government, universities and quantum industry players, driving policy, programs and brand events.' where public_job_code='QJ-26-0026';

update job_publications set public_title_en='Quantum Control Engineer (Intern)', direction_en='Neutral-Atom Quantum Control & Measurement', seniority_en='Intern', summary_en='Supports quantum control-system scripting, debugging, automation and experiment-data tooling.' where public_job_code='QJ-26-0027';

update job_publications set public_title_en='AI Algorithm Engineer (Quantum Computing / Mathematical Optimization)', direction_en='AI & Quantum Control Optimization', seniority_en='R&D Engineer', summary_en='Builds scheduling, resource-allocation, parameter-update, error-mitigation and closed-loop optimization algorithms for quantum control, from prototype to engineering.' where public_job_code='QJ-26-0028';

update job_publications set public_title_en='Quantum Compiler Engineer', direction_en='Neutral-Atom Quantum Compilation', seniority_en='Mid-Senior R&D', summary_en='Builds neutral-atom compilation pipelines covering IR, optimization passes, hardware-specific lowering and atom-shuttling scheduling under Rydberg blockade constraints.' where public_job_code='QJ-26-0029';

update job_publications set public_title_en='Project Manager', direction_en='Quantum R&D Project Management', seniority_en='Mid-Senior Functional Role', summary_en='Coordinates experiment, hardware, algorithm and control teams; owns task breakdown, schedule risk, roadmaps and government project management.' where public_job_code='QJ-26-0030';

update job_publications set public_title_en='Quantum Error Correction Algorithm Engineer', direction_en='Neutral-Atom Quantum Error Correction', seniority_en='R&D Engineer / Researcher', summary_en='Researches and simulates QEC codes, noise models, thresholds and resource overheads for neutral-atom platforms, working with control and hardware teams toward deployment.' where public_job_code='QJ-26-0031';

update job_publications set public_title_en='Quantum Computing Algorithm Engineer', direction_en='Neutral-Atom Quantum Algorithms', seniority_en='R&D Engineer', summary_en='Develops quantum algorithms and circuit compilation for neutral-atom platforms, combining Rydberg gates, tweezer arrays, simulation tools and ML-based experiment analysis.' where public_job_code='QJ-26-0032';

update job_publications set public_title_en='PR Director / Manager', direction_en='Brand & Public Relations', seniority_en='Manager / Director', summary_en='Owns media, KOL, launch and financing/product event communications, supporting reputation monitoring and crisis communications.' where public_job_code='QJ-26-0033';

update job_publications set public_title_en='Industry Solutions Manager (Government)', direction_en='Government Quantum Solutions', seniority_en='Mid-Senior Solutions Role', summary_en='Provides consulting, solution design, bidding and project management for government and large computing centers around neutral-atom and classical computing.' where public_job_code='QJ-26-0034';

update job_publications set public_title_en='Program Application Specialist / Supervisor', direction_en='S&T Program Applications & IP', seniority_en='Specialist / Supervisor', summary_en='Tracks science and technology policies, files government program applications and patents, and supports R&D patent portfolio strategy.' where public_job_code='QJ-26-0035';

update job_publications set public_title_en='Quantum Gate Operations Engineer', direction_en='Neutral-Atom Quantum Control', seniority_en='R&D Engineer', summary_en='Improves neutral-atom gate fidelity via physical modeling, pulse design and noise-dynamics simulation, coupled with experimental parameter optimization.' where public_job_code='QJ-26-0036';

update job_publications set public_title_en='Embedded Software Engineer', direction_en='Quantum Control Embedded Systems', seniority_en='R&D Engineer', summary_en='Owns Zynq BSP, drivers and PS/PL high-speed data paths, supporting hardware bring-up, HIL and system-level debugging.' where public_job_code='QJ-26-0037';

update job_publications set public_title_en='Electronics Engineer', direction_en='Laser Control Electronics', seniority_en='R&D Engineer', summary_en='Designs laser control-system hardware and embedded electronics to improve noise, frequency and power stability.' where public_job_code='QJ-26-0038';

update job_publications set public_title_en='Mechanical / Structural Engineer', direction_en='Quantum Optical Platform Mechanics', seniority_en='R&D Engineer', summary_en='Designs mechanical structures, thermal management and precision fixtures for laser and quantum-optical platforms, ensuring stability and manufacturability.' where public_job_code='QJ-26-0039';

update job_publications set public_title_en='Laser Engineer', direction_en='Neutral-Atom Laser Systems', seniority_en='R&D Engineer', summary_en='Develops kHz narrow-linewidth single-frequency fiber laser seed sources and 1.5/1.9 um light sources toward device validation, productization and volume production.' where public_job_code='QJ-26-0040';

update job_publications set public_title_en='Quantum Engineer (Intern)', direction_en='Neutral-Atom Experiments', seniority_en='Intern', summary_en='Supports quantum-optics and cold-atom experiments, data collection and analysis, plus daily lab operations and documentation.' where public_job_code='QJ-26-0041';

update job_publications set public_title_en='Optics Engineer', direction_en='Quantum Optical Systems', seniority_en='R&D Engineer', summary_en='Owns quantum optical system design, Zemax simulation, precision optical platform assembly, component selection and supply-chain coordination.' where public_job_code='QJ-26-0042';

update job_publications set public_title_en='Quantum Engineer', direction_en='Neutral-Atom Quantum Computing Platform', seniority_en='R&D Engineer', summary_en='Participates in neutral-atom platform R&D covering tweezer arrays, cooling and trapping, initialization, control, readout, optics-electronics integration and scalability.' where public_job_code='QJ-26-0043';

update job_publications set public_title_en='Junior Quantum Engineer', direction_en='Neutral-Atom Quantum Control', seniority_en='Junior R&D Engineer', summary_en='Supports neutral-atom physical modeling, gate-fidelity data analysis, pulse simulation, noise modeling and literature replication.' where public_job_code='QJ-26-0044';

update job_publications set public_title_en='Quantum Scientist', direction_en='Neutral-Atom Quantum Computing Research', seniority_en='Scientist / Tech Lead', summary_en='Leads frontier instrumentation and research directions in neutral-atom quantum computing, advancing tweezer arrays, gate control, error-correction hardware and novel gate schemes.' where public_job_code='QJ-26-0045';

update job_publications set public_title_en='Optics Engineer', direction_en='Quantum Optical Systems', seniority_en=null, summary_en='Delivers optical design, assembly, alignment and stability optimization for the neutral-atom quantum computing experimental platform.' where public_job_code='QJ-26-0046';

update job_publications set public_title_en='Quantum Experiment Noise Modeling & Numerical Simulation Engineer', direction_en='Quantum Experiment Noise & Numerical Simulation', seniority_en=null, summary_en='Builds noise models and numerical simulations for quantum experiment systems, supporting control and fidelity optimization.' where public_job_code='QJ-26-0047';

update job_publications set public_title_en='Fault-Tolerant Quantum Computing Architecture & Resource Optimization Engineer', direction_en='Fault-Tolerant Quantum Computing Architecture', seniority_en=null, summary_en='Designs fault-tolerant architectures and evaluates logical qubits, physical resource costs and algorithm execution overheads.' where public_job_code='QJ-26-0048';

update job_publications set public_title_en='Algorithm Engineer', direction_en='Quantum Algorithms', seniority_en=null, summary_en='General algorithm role; confirm in the job details whether it focuses on quantum algorithms, experiment-control algorithms or AI algorithms.' where public_job_code='QJ-26-0049';

update job_publications set public_title_en='Quantum Chemistry, Quantum Simulation & Materials / Biopharma Algorithm Engineer', direction_en='Quantum Chemistry & Simulation Applications', seniority_en=null, summary_en='Develops quantum chemistry, quantum simulation and application algorithms for materials and biopharma use cases.' where public_job_code='QJ-26-0050';

update job_publications set public_title_en='Quantum Machine Learning / Applied Algorithm Engineer', direction_en='Quantum Machine Learning & Applied Algorithms', seniority_en=null, summary_en='Explores quantum machine learning and applied algorithms, connecting quantum computing capabilities to industry problems.' where public_job_code='QJ-26-0051';

update job_publications set public_title_en='Quantum Error-Correction Coding & Decoding Algorithm Engineer', direction_en='Quantum Error Correction & Decoding', seniority_en=null, summary_en='Develops QEC encoding and decoding algorithms underpinning the logical layer of fault-tolerant quantum computing.' where public_job_code='QJ-26-0052';

update job_publications set public_title_en='Digital Circuit / Embedded Development Engineer', direction_en='Quantum Control Digital & Embedded Systems', seniority_en=null, summary_en='Develops digital circuits, embedded software and hardware-software interfaces for quantum experiment and control equipment.' where public_job_code='QJ-26-0053';

update job_publications set public_title_en='Quantum Algorithm Engineer (Applications & Error Correction)', direction_en='Quantum Algorithms & Error-Correction Applications', seniority_en=null, summary_en='R&D role spanning applied quantum algorithms and quantum error correction.' where public_job_code='QJ-26-0054';

update job_publications set public_title_en='Analog / Digital Circuit Engineer', direction_en='Quantum Control Electronics', seniority_en=null, summary_en='Designs analog and digital circuits and control electronics modules for quantum experiment systems.' where public_job_code='QJ-26-0055';

update job_publications set public_title_en='Mechanical Design Engineer', direction_en='Quantum Experiment Platform Mechanics', seniority_en=null, summary_en='Provides mechanical structure, assembly and stability design for quantum optics and control experimental platforms.' where public_job_code='QJ-26-0056';

update job_publications set public_title_en='Cold-Atom Systems Engineer', direction_en='Cold-Atom Quantum Computing Systems', seniority_en=null, summary_en='Develops and maintains cold-atom quantum computing systems — a core experimental role of the neutral-atom track.' where public_job_code='QJ-26-0057';

update job_publications set public_title_en='High-Speed Imaging & Embedded Processing Engineer', direction_en='Quantum Readout & High-Speed Imaging', seniority_en=null, summary_en='Owns high-speed imaging, embedded processing and experiment readout chains, potentially serving atomic-array state detection.' where public_job_code='QJ-26-0058';

update job_publications set public_title_en='Control & Measurement Engineer', direction_en='Quantum Control Systems', seniority_en=null, summary_en='Supports control, data acquisition, automation and debugging of quantum experiment hardware.' where public_job_code='QJ-26-0059';

update job_publications set public_title_en='Platform Development Engineer', direction_en='Quantum Software Platforms', seniority_en=null, summary_en='May own software platform development for quantum experiments or products; exact frontend/backend and systems scope to be confirmed in the job details.' where public_job_code='QJ-26-0060';

update job_publications set public_title_en='IT Support Specialist', direction_en='IT Support', seniority_en=null, summary_en='Corporate IT operations and user support; not part of the core quantum talent showcase line.' where public_job_code='QJ-26-0061';

update job_publications set public_title_en='PR Lead / Brand Content Manager', direction_en='Brand & Public Relations', seniority_en=null, summary_en='Owns brand communications, content operations and public relations; not part of the core quantum talent showcase line.' where public_job_code='QJ-26-0062';

update job_publications set public_title_en='GPU Development Engineer', direction_en='Heterogeneous Computing & Real-Time Data Paths', seniority_en='R&D Engineer', summary_en='Builds GPU/FPGA heterogeneous data paths and real-time processing for quantum experiments and high-speed acquisition.' where public_job_code='QJ-26-0065';

update job_publications set public_title_en='Quantum Engineer', direction_en='Neutral-Atom Quantum Computing Platform', seniority_en='R&D Engineer', summary_en='Participates in neutral-atom platform assembly, optics and vacuum system maintenance, and qubit control performance optimization.' where public_job_code='QJ-26-0066';

update job_publications set public_title_en='Optics Engineer', direction_en='Quantum Optics & Free-Space Optical Paths', seniority_en='R&D Engineer', summary_en='Owns free-space optical path design, simulation, assembly and precision optics component selection for quantum optical platforms.' where public_job_code='QJ-26-0067';

update job_publications set public_title_en='Project Manager', direction_en='Quantum R&D Project Management', seniority_en='Mid-Senior Functional Role', summary_en='Orchestrates experiment, hardware, algorithm and control teams to drive planning, risk management and milestone delivery of quantum R&D projects.' where public_job_code='QJ-26-0068';

update job_publications set public_title_en='Quantum Computing Algorithm Engineer', direction_en='Neutral-Atom Quantum Algorithms & Simulation', seniority_en='R&D Engineer', summary_en='Develops quantum algorithms, simulation tools and experiment-data-driven optimization for neutral-atom platforms.' where public_job_code='QJ-26-0069';

update job_publications set public_title_en='Quantum Scientist', direction_en='Neutral-Atom Quantum Computing Research', seniority_en='Scientist / Tech Lead', summary_en='Owns frontier research, scientific innovation and technical direction for the neutral-atom quantum computing platform.' where public_job_code='QJ-26-0070';

update job_publications set public_title_en='Quantum Error Correction Algorithm Engineer', direction_en='Neutral-Atom Quantum Error Correction', seniority_en='R&D Engineer / Researcher', summary_en='Researches QEC codes, noise models, decoding and hardware feedback for neutral-atom platforms.' where public_job_code='QJ-26-0071';

update job_publications set public_title_en='Quantum Compiler Engineer', direction_en='Neutral-Atom Quantum Compilation', seniority_en='Mid-Senior R&D', summary_en='Builds quantum compilation pipelines, optimization passes and physically constrained atom scheduling for neutral-atom hardware.' where public_job_code='QJ-26-0072';

update job_publications set public_title_en='Electronics Engineer', direction_en='Laser Control Electronics', seniority_en='R&D Engineer', summary_en='Designs analog circuits, PCBs, embedded hardware and stability solutions for laser control systems.' where public_job_code='QJ-26-0073';

update job_publications set public_title_en='Embedded Software Engineer', direction_en='Quantum Control Embedded Systems', seniority_en='R&D Engineer', summary_en='Owns Zynq BSP, drivers, PS/PL high-speed data paths and integrated debugging of quantum control equipment.' where public_job_code='QJ-26-0074';

update job_publications set public_title_en='Mechanical / Structural Engineer', direction_en='Quantum Optical Platform Mechanics', seniority_en='R&D Engineer', summary_en='Owns mechanical structure, thermal management, precision tooling and design-for-manufacturability for laser and quantum-optical platforms.' where public_job_code='QJ-26-0075';

-- ---------------------------------------------------------------------
-- 校验：应返回 72（已回填英文标题的已发布岗位数）
-- ---------------------------------------------------------------------
-- select count(*) from job_publications where status='published' and public_title_en is not null;
