%% confabs.cls -- conference extended-abstract document class (Suberus)
%% One-page abstract: bold centred title, superscript-marked authors, italic
%% affiliations, e-mails, keywords, continuous abstract prose, booktabs tables,
%% pgfplots/TikZ figures, biblatex references. Build with: latexmk -pdf <file>
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{confabs}[2026/06/24 Conference extended-abstract class]
\LoadClass[11pt,a4paper]{article}

\RequirePackage[T1]{fontenc}
\RequirePackage{newtxtext,newtxmath}          % Times text + math
\RequirePackage[a4paper,margin=2.5cm]{geometry}
\RequirePackage{graphicx}
\RequirePackage{booktabs}
\RequirePackage{siunitx}
\RequirePackage[font=small,labelfont=bf,labelsep=period]{caption}
\RequirePackage{microtype}
\RequirePackage{etoolbox}
\RequirePackage{xcolor}
\RequirePackage{pgfplots}
\pgfplotsset{compat=1.18}
\RequirePackage[backend=biber,style=numeric-comp,sorting=none]{biblatex}
\RequirePackage[hidelinks]{hyperref}

\addbibresource{references.bib}

\setlength{\parindent}{0pt}
\setlength{\parskip}{6pt}
\pagestyle{empty}

% --- header data -----------------------------------------------------------
\def\@email{}\def\@keywords{}
\newcommand{\email}[1]{\gdef\@email{#1}}
\newcommand{\keywords}[1]{\gdef\@keywords{#1}}

% \affiliation{<marker>}{<text>} -- call once per affiliation, in order
\newcommand{\affillist}{}
\newcommand{\affilline}[2]{{\itshape\footnotesize\textsuperscript{#1}\,#2\par}}
\newcommand{\affiliation}[2]{\g@addto@macro\affillist{\affilline{#1}{#2}}}

\renewcommand{\maketitle}{%
  \begingroup
  \setlength{\parskip}{0pt}%
  \begin{center}
    {\Large\bfseries\@title\par}\vspace{8pt}%
    {\large\@author\par}\vspace{3pt}%
    \affillist\vspace{2pt}%
    \ifdefempty{\@email}{}{{\itshape\footnotesize E-mails: \@email\par}}%
  \end{center}
  \endgroup
  \vspace{2pt}%
  \noindent\textbf{Keywords:} \@keywords\par
  \vspace{6pt}%
}

% presenting-author marker helper: \pres -> superscript asterisk
\newcommand{\pres}{\textsuperscript{*}}
