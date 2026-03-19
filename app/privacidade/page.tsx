export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-zinc-900">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-zinc-200">
        
        <h1 className="text-3xl font-black mb-6 text-indigo-600">Política de Privacidade</h1>
        <p className="text-sm text-zinc-500 mb-8">Última atualização: 19 de março de 2026</p>

        <div className="space-y-8 leading-relaxed text-zinc-700">
          
          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">1. Introdução</h2>
            <p>
              Bem-vindo ao <strong>Nexus Delivery</strong>. Nós respeitamos a sua privacidade e estamos comprometidos em proteger os seus dados pessoais. Esta política explica como coletamos, usamos e protegemos as suas informações ao utilizar a nossa plataforma de gestão, CRM e automação de marketing digital.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">2. Dados que Coletamos</h2>
            <p className="mb-2">Ao utilizar nossa plataforma, podemos coletar os seguintes dados:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Informações de Cadastro:</strong> Nome, e-mail, nome do estabelecimento e dados de contato.</li>
              <li><strong>Dados de Integração (Meta/Facebook):</strong> Quando você conecta sua conta do Facebook, recebemos tokens de acesso que nos permitem gerenciar suas Páginas e campanhas de anúncios em seu nome, conforme sua autorização.</li>
              <li><strong>Dados Financeiros:</strong> Histórico de assinaturas e recargas de saldo (processados de forma segura via Stripe). Não armazenamos os dados completos do seu cartão de crédito em nossos servidores.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">3. Como Usamos Seus Dados</h2>
            <p className="mb-2">Utilizamos as informações coletadas estritamente para fornecer e melhorar nossos serviços, incluindo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Operar sua vitrine digital e gerenciar pedidos do seu restaurante.</li>
              <li>Criar, publicar e otimizar campanhas de anúncios locais no Meta Ads através da nossa inteligência artificial.</li>
              <li>Gerenciar sua carteira de clientes (CRM) e processar pagamentos das taxas de serviço.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">4. Compartilhamento de Dados</h2>
            <p>
              O Nexus Delivery <strong>não vende, aluga ou compartilha</strong> seus dados pessoais com terceiros para fins de marketing. Seus dados são compartilhados apenas com prestadores de serviços essenciais para o funcionamento da plataforma, como a Stripe (para pagamentos) e a Meta (para veiculação dos seus próprios anúncios).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">5. Instruções para Exclusão de Dados</h2>
            <p>
              De acordo com as regras da Meta e a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar a exclusão total dos seus dados e revogar o acesso da nossa plataforma à sua conta do Facebook a qualquer momento.
            </p>
            <p className="mt-2">
              Para revogar o acesso via Facebook: Acesse as configurações de Segurança e Login do seu perfil no Facebook, vá em "Integrações comerciais" ou "Aplicativos e Sites", localize o nosso aplicativo e clique em "Remover".
            </p>
            <p className="mt-2">
              Para excluir sua conta e todos os dados do nosso banco de dados, envie um e-mail solicitando a exclusão para: <strong>contato@agenciapublicart.com.br</strong> <em>(substitua pelo seu e-mail real)</em>. O processo será concluído em até 7 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">6. Segurança</h2>
            <p>
              Adotamos medidas de segurança rígidas e criptografia de ponta a ponta para proteger seus tokens de acesso, dados de clientes e informações financeiras contra acessos não autorizados.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}