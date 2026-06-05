import type { ReactNode } from "react";
import { Link } from "wouter";
import { CalendarDays, Mail, ShieldCheck, LifeBuoy, type LucideIcon } from "lucide-react";

const SUPPORT_EMAIL = "meusplantoes.app@gmail.com";

function PublicPageShell({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-8 text-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100">
      <main className="mx-auto w-full max-w-4xl">
        <header className="mb-8 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300">
            <CalendarDays className="h-4 w-4" />
            Meus Plantões
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{subtitle}</p>
            </div>
          </div>
        </header>

        <section className="space-y-6 rounded-3xl border border-white/70 bg-white/90 p-6 leading-7 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none sm:p-8">
          {children}
        </section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
      <div className="space-y-3 text-slate-700 dark:text-slate-300">{children}</div>
    </section>
  );
}

export function PrivacyPolicyPage() {
  return (
    <PublicPageShell
      title="Política de Privacidade"
      subtitle="Informações sobre o tratamento de dados no aplicativo Meus Plantões."
      icon={ShieldCheck}
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">Última atualização: 05 de junho de 2026.</p>

      <Section title="1. Sobre o aplicativo">
        <p>
          O <strong>Meus Plantões</strong> é um aplicativo de organização pessoal e profissional voltado ao registro de plantões, agenda, diário, medicamentos, informações financeiras e lembretes. O acesso ao aplicativo é restrito a usuários autorizados por login.
        </p>
      </Section>

      <Section title="2. Dados tratados">
        <p>
          O aplicativo pode armazenar dados informados pelo próprio usuário, como nome de usuário, senha de acesso, eventos de agenda, escalas de plantão, registros de diário, medicamentos, categorias, lançamentos financeiros, lembretes e observações livres preenchidas dentro do app.
        </p>
        <p>
          O aplicativo não solicita permissões sensíveis do dispositivo, como localização contínua, câmera, microfone, contatos ou rastreamento entre aplicativos para fins publicitários.
        </p>
      </Section>

      <Section title="3. Finalidade do uso dos dados">
        <p>
          Os dados são utilizados para permitir o funcionamento das funcionalidades internas do aplicativo, incluindo autenticação, visualização de calendário, organização de plantões, consulta de registros pessoais, controle de medicamentos, diário e acompanhamento financeiro.
        </p>
      </Section>

      <Section title="4. Compartilhamento de dados">
        <p>
          Os dados do aplicativo não são vendidos a terceiros. As informações podem ser processadas por provedores técnicos necessários para hospedagem, banco de dados, autenticação, armazenamento e operação do serviço.
        </p>
      </Section>

      <Section title="5. Segurança e acesso">
        <p>
          O acesso ao aplicativo é protegido por credenciais. Recomendamos que cada usuário mantenha sua senha em sigilo e utilize apenas dados fictícios em contas de demonstração ou revisão.
        </p>
      </Section>

      <Section title="6. Solicitações do usuário">
        <p>
          Para solicitar suporte, correção ou remoção de informações, entre em contato pelo e-mail público de suporte: <a className="font-medium text-indigo-600 hover:underline dark:text-indigo-300" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="7. Alterações nesta política">
        <p>
          Esta política poderá ser atualizada para refletir melhorias no aplicativo, alterações legais ou ajustes operacionais. A data de atualização será modificada sempre que houver mudança relevante.
        </p>
      </Section>
    </PublicPageShell>
  );
}

export function SupportPage() {
  return (
    <PublicPageShell
      title="Suporte"
      subtitle="Canal oficial de atendimento do aplicativo Meus Plantões."
      icon={LifeBuoy}
    >
      <Section title="Como obter ajuda">
        <p>
          Para dúvidas, problemas de acesso, solicitações relacionadas a dados ou suporte geral do aplicativo <strong>Meus Plantões</strong>, envie uma mensagem para o e-mail abaixo.
        </p>
        <a
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700"
          href={`mailto:${SUPPORT_EMAIL}`}
        >
          <Mail className="h-5 w-5" />
          {SUPPORT_EMAIL}
        </a>
      </Section>

      <Section title="Informações úteis para agilizar o atendimento">
        <p>
          Ao entrar em contato, informe seu nome de usuário, uma descrição objetiva do problema, a tela em que ocorreu e, se possível, o horário aproximado do erro. Não envie senhas por e-mail.
        </p>
      </Section>

      <Section title="Privacidade">
        <p>
          A política de privacidade está disponível em <Link href="/privacy" className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">/privacy</Link>.
        </p>
      </Section>
    </PublicPageShell>
  );
}
