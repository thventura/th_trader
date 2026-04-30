export interface LeadItem {
  id: string;
  nome: string;
  email: string;
  depositos: number;
  saldo: number;
  trades: number;
  volume: number;
  comissao: number;
}

export interface IndicacaoItem {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  data_registro: string;
  ftd: boolean;
  saldo: number;
  depositos: number;
  trades: number;
  comissao: number;
}

export interface GraficoPoint {
  data: string;
  valor: number;
}

export interface DetalhamentoItem {
  data: string;
  registros: number;
  ftds: number;
  qtd_dep: number;
  depositos: number;
  trades: number;
  comissao: number;
}

export interface SaqueItem {
  id: string;
  data: string;
  metodo: string;
  status: 'Concluído' | 'Rejeitado' | 'Pendente';
  valor: number;
}

export interface ConviteItem {
  id: string;
  convidador_nome: string;
  convidador_email: string;
  convidado_email: string;
  convidado_nome: string;
  status: string;
  volume: number;
  meta_volume: number;
  recompensa: number;
  codigo: string;
  enviado: string;
}

export interface Config {
  configVersion: string;
  usuario: { nome: string; email: string };
  dashboard: {
    disponivel_saque: number;
    dias_retencao: number;
    saldo_pendente: number;
    proxima_liberacao: string;
    total_sacado: number;
    indicacoes: number;
    ftds: number;
    total_depositado: number;
    total_trades: number;
    saldo_total_leads: number;
    comissao_afiliado: number;
    comissao_sub_afiliado: number;
    tipo_comissao: string;
    requisito_ftds: number;
    liberacao_dia: string;
  };
  leads: LeadItem[];
  indicacoes: IndicacaoItem[];
  estatisticas: {
    registros: number;
    ftds: number;
    depositos: number;
    trades: number;
    comissao_total: number;
    grafico: GraficoPoint[];
    detalhamento: DetalhamentoItem[];
  };
  saques: {
    disponivel_lead: number;
    disponivel_sub: number;
    saldo_liberar_lead: number;
    saldo_liberar_sub: number;
    proxima_liberacao: string;
    requisito_ftds: number;
    ftds_atual: number;
    historico: SaqueItem[];
  };
  convites: {
    total: number;
    pendentes: number;
    cadastrados: number;
    depositaram: number;
    completos: number;
    recompensas: number;
    lista: ConviteItem[];
  };
}

export const defaultConfig: Config = {
  configVersion: '2026-04-28-v1',
  usuario: {
    nome: 'Pablo Geraldo Linhares do Nascimento Leite',
    email: 'pablogln45@hotmail.com',
  },
  dashboard: {
    disponivel_saque: 0.46,
    dias_retencao: 0,
    saldo_pendente: 0.0,
    proxima_liberacao: '28/04/2026',
    total_sacado: 18129.14,
    indicacoes: 174,
    ftds: 109,
    total_depositado: 103274.80,
    total_trades: 7897,
    saldo_total_leads: 780.15,
    comissao_afiliado: 50,
    comissao_sub_afiliado: 5,
    tipo_comissao: 'REV Share',
    requisito_ftds: 0,
    liberacao_dia: 'Terça',
  },
  leads: [
    { id: '1', nome: 'Sidney Barros dos santos', email: 'sbarros@cenum.es', depositos: 300.0, saldo: 1.8, trades: 32, volume: 701.25, comissao: 186.98 },
    { id: '2', nome: 'Isaque Vitório Hermogenes da Silva', email: 'isaquee.org@gmail.com', depositos: 2484.05, saldo: 0.0, trades: 2, volume: 100.0, comissao: 50.0 },
    { id: '3', nome: 'junior luis da silva silva', email: 'jnwiskk@gmail.com', depositos: 330.0, saldo: 376.65, trades: 7, volume: 70.0, comissao: 16.3 },
    { id: '4', nome: 'Nina Raphaella Bezerra', email: 'nina.raphaella@gmail.com', depositos: 450.0, saldo: 313.0, trades: 7, volume: 20.0, comissao: 2.98 },
    { id: '5', nome: 'Carlos Eduardo Moreira', email: 'carlosmoreira@gmail.com', depositos: 8500.0, saldo: 2340.15, trades: 499, volume: 24950.0, comissao: 1420.50 },
    { id: '6', nome: 'Ana Paula Ferreira', email: 'anapaula.ferreira95@hotmail.com', depositos: 6200.0, saldo: 1850.40, trades: 380, volume: 19000.0, comissao: 890.30 },
    { id: '7', nome: 'Roberto Alves Santana', email: 'roberto.alves@outlook.com', depositos: 5800.0, saldo: 890.30, trades: 520, volume: 26000.0, comissao: 1050.40 },
    { id: '8', nome: 'Mariana Costa Oliveira', email: 'mariana.oliveira@gmail.com', depositos: 4300.0, saldo: 1120.55, trades: 210, volume: 10500.0, comissao: 380.20 },
    { id: '9', nome: 'Felipe Henrique Lima', email: 'felipehlima@gmail.com', depositos: 7160.75, saldo: 2890.20, trades: 1050, volume: 52500.0, comissao: 2340.80 },
    { id: '10', nome: 'Juliana Rodrigues Santos', email: 'juliana.rod2023@gmail.com', depositos: 3500.0, saldo: 430.10, trades: 145, volume: 7250.0, comissao: 230.60 },
    { id: '11', nome: 'Lucas Pereira dos Santos', email: 'lucaspereira88@gmail.com', depositos: 5200.0, saldo: 1670.85, trades: 420, volume: 21000.0, comissao: 920.45 },
    { id: '12', nome: 'Fernanda Almeida Costa', email: 'fernsalmeida@hotmail.com', depositos: 2800.0, saldo: 320.45, trades: 165, volume: 8250.0, comissao: 280.30 },
    { id: '13', nome: 'Thiago Barbosa Lopes', email: 'thiagobarbosa.tr@gmail.com', depositos: 4700.0, saldo: 1230.60, trades: 390, volume: 19500.0, comissao: 710.55 },
    { id: '14', nome: 'Camila Sousa Ferreira', email: 'camilasousa24@gmail.com', depositos: 3900.0, saldo: 650.25, trades: 280, volume: 14000.0, comissao: 560.40 },
    { id: '15', nome: 'Diego Nascimento Gomes', email: 'diegonascimento@outlook.com', depositos: 6500.0, saldo: 2100.30, trades: 710, volume: 35500.0, comissao: 1780.25 },
    { id: '16', nome: 'Larissa Gomes Ribeiro', email: 'larissagomes@gmail.com', depositos: 2100.0, saldo: 180.90, trades: 130, volume: 6500.0, comissao: 180.15 },
    { id: '17', nome: 'Gabriel Mendes Vieira', email: 'gabrielmendes.fx@gmail.com', depositos: 4150.0, saldo: 980.75, trades: 340, volume: 17000.0, comissao: 620.30 },
    { id: '18', nome: 'Beatriz Carvalho Martins', email: 'beatriz.carvalho@gmail.com', depositos: 1800.0, saldo: 95.40, trades: 95, volume: 4750.0, comissao: 95.20 },
    { id: '19', nome: 'Anderson Ribeiro Campos', email: 'andersonribeiro@hotmail.com', depositos: 3200.0, saldo: 540.15, trades: 225, volume: 11250.0, comissao: 340.45 },
    { id: '20', nome: 'Priscila Monteiro Lima', email: 'priscimonteiro@gmail.com', depositos: 2500.0, saldo: 245.80, trades: 180, volume: 9000.0, comissao: 240.60 },
    { id: '21', nome: 'Vinicius Souza Barbosa', email: 'vinicius.souza.tr@gmail.com', depositos: 5600.0, saldo: 1890.45, trades: 465, volume: 23250.0, comissao: 1050.35 },
    { id: '22', nome: 'Stephanie Costa Rodrigues', email: 'stephcosta22@gmail.com', depositos: 1500.0, saldo: 45.20, trades: 85, volume: 4250.0, comissao: 80.25 },
    { id: '23', nome: 'Eduardo Pinto Nascimento', email: 'eduardopinto.trade@gmail.com', depositos: 3800.0, saldo: 720.35, trades: 310, volume: 15500.0, comissao: 490.40 },
    { id: '24', nome: 'Natalia Vieira Correia', email: 'nataliavieira@hotmail.com', depositos: 2900.0, saldo: 380.60, trades: 195, volume: 9750.0, comissao: 295.55 },
    { id: '25', nome: 'Bruno Teixeira Almeida', email: 'brunoteixeira.br@gmail.com', depositos: 4400.0, saldo: 1050.25, trades: 360, volume: 18000.0, comissao: 680.30 },
    { id: '26', nome: 'Tatiana Campos Rocha', email: 'tatianacampos@gmail.com', depositos: 1900.0, saldo: 125.70, trades: 110, volume: 5500.0, comissao: 115.40 },
    { id: '27', nome: 'Paulo Henrique Freitas', email: 'paulohenrique.inv@gmail.com', depositos: 5100.0, saldo: 1560.40, trades: 430, volume: 21500.0, comissao: 890.55 },
    { id: '28', nome: 'Renata Lopes Cardoso', email: 'renatalopes95@gmail.com', depositos: 2200.0, saldo: 210.85, trades: 155, volume: 7750.0, comissao: 195.30 },
  ],
  indicacoes: [
    // Nov 21 — 5 FTD
    { id: '1', nome: 'Thiago Rodrigues Moura', email: 'thiago.r.moura@gmail.com', tipo: 'Lead', data_registro: '21/11/2025', ftd: true, saldo: 0.00, depositos: 300.00, trades: 5, comissao: 0.00 },
    { id: '2', nome: 'Camila Bezerra dos Santos', email: 'camilabezerra@gmail.com', tipo: 'Lead', data_registro: '21/11/2025', ftd: true, saldo: 125.40, depositos: 1200.00, trades: 18, comissao: 0.00 },
    { id: '3', nome: 'Leandro Pereira Lima', email: 'leandrolima88@gmail.com', tipo: 'Lead', data_registro: '21/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 12, comissao: 0.00 },
    { id: '4', nome: 'Rafaela Costa Vieira', email: 'rafaela.costa@hotmail.com', tipo: 'Lead', data_registro: '21/11/2025', ftd: true, saldo: 0.00, depositos: 1500.00, trades: 8, comissao: 0.00 },
    { id: '5', nome: 'Lucas Henrique Freitas', email: 'lucasfreitas.fx@gmail.com', tipo: 'Lead', data_registro: '21/11/2025', ftd: true, saldo: 0.00, depositos: 1144.80, trades: 22, comissao: 0.00 },
    // Nov 21 — 4 sem FTD
    { id: '6', nome: 'Fabio Mendes Rocha', email: 'fabiomendes@gmail.com', tipo: 'Lead', data_registro: '21/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '7', nome: 'Patricia Carvalho Nunes', email: 'patriciacarvalho@gmail.com', tipo: 'Lead', data_registro: '21/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '8', nome: 'Adriano Correia Silva', email: 'adrianocorreia@gmail.com', tipo: 'Lead', data_registro: '21/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '9', nome: 'Carolina Machado Lima', email: 'carolmachado@hotmail.com', tipo: 'Lead', data_registro: '21/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 20 — 7 FTD
    { id: '10', nome: 'Marco Aurélio Santos', email: 'marcoaurelio@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 14, comissao: 0.00 },
    { id: '11', nome: 'Bianca Ferreira Costa', email: 'biancaferreira@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: true, saldo: 80.20, depositos: 1100.00, trades: 9, comissao: 0.00 },
    { id: '12', nome: 'Victor Hugo Campos', email: 'victorhcampos@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 11, comissao: 0.00 },
    { id: '13', nome: 'Daniela Souza Martins', email: 'danielasouza@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: true, saldo: 0.00, depositos: 1050.00, trades: 7, comissao: 0.00 },
    { id: '14', nome: 'Ricardo Barbosa Lopes', email: 'ricardolopes@hotmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: true, saldo: 0.00, depositos: 950.00, trades: 16, comissao: 0.00 },
    { id: '15', nome: 'Elaine Monteiro Gomes', email: 'elainemonteiro@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 6, comissao: 0.00 },
    { id: '16', nome: 'Wagner Nascimento Silva', email: 'wagnernascimento@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: true, saldo: 0.00, depositos: 1120.00, trades: 20, comissao: 0.00 },
    // Nov 20 — 5 sem FTD
    { id: '17', nome: 'Ingrid Alves Ribeiro', email: 'ingrida.ribeiro@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '18', nome: 'Davi Cunha Pereira', email: 'davicunhap@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '19', nome: 'Gisele Teixeira Moreira', email: 'giseleteixeira@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '20', nome: 'Kaio Ferreira Barbosa', email: 'kaioferreira@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '21', nome: 'Helena Rocha Cardoso', email: 'helenarocha@gmail.com', tipo: 'Lead', data_registro: '20/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 19 — 5 FTD
    { id: '22', nome: 'Ivan Oliveira Santos', email: 'ivanoliveira@gmail.com', tipo: 'Lead', data_registro: '19/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 10, comissao: 0.00 },
    { id: '23', nome: 'Flavia Mendes Lima', email: 'flaviamendes@hotmail.com', tipo: 'Lead', data_registro: '19/11/2025', ftd: true, saldo: 0.00, depositos: 1200.00, trades: 15, comissao: 0.00 },
    { id: '24', nome: 'Alan Cavalcante Souza', email: 'alancavalcante@gmail.com', tipo: 'Lead', data_registro: '19/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 8, comissao: 0.00 },
    { id: '25', nome: 'Monica Silva Cardoso', email: 'monicasilva.trade@gmail.com', tipo: 'Lead', data_registro: '19/11/2025', ftd: true, saldo: 60.50, depositos: 750.00, trades: 12, comissao: 0.00 },
    { id: '26', nome: 'Hugo Lopes Almeida', email: 'hugolopes@gmail.com', tipo: 'Lead', data_registro: '19/11/2025', ftd: true, saldo: 0.00, depositos: 1100.00, trades: 18, comissao: 0.00 },
    // Nov 19 — 3 sem FTD
    { id: '27', nome: 'Josiane Correia Ferreira', email: 'josianecorreia@gmail.com', tipo: 'Lead', data_registro: '19/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '28', nome: 'Mario Andrade Costa', email: 'marioandrade@gmail.com', tipo: 'Lead', data_registro: '19/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '29', nome: 'Aline Pereira Vieira', email: 'alinepereira88@gmail.com', tipo: 'Lead', data_registro: '19/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 18 — 7 FTD
    { id: '30', nome: 'Jorge Bezerra Machado', email: 'jorgebezerra@gmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: true, saldo: 0.00, depositos: 1200.00, trades: 20, comissao: 0.00 },
    { id: '31', nome: 'Barbara Campos Santos', email: 'barbaracampos@gmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 7, comissao: 0.00 },
    { id: '32', nome: 'Luis Felipe Martins', email: 'luisfelipe.martins@gmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: true, saldo: 95.30, depositos: 950.00, trades: 14, comissao: 0.00 },
    { id: '33', nome: 'Cecilia Oliveira Barros', email: 'ceciliao@hotmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: true, saldo: 0.00, depositos: 1100.00, trades: 11, comissao: 0.00 },
    { id: '34', nome: 'Renato Xavier Lima', email: 'renatoxavier@gmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 16, comissao: 0.00 },
    { id: '35', nome: 'Debora Rodrigues Costa', email: 'debora.rodrigues@gmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: true, saldo: 0.00, depositos: 750.00, trades: 5, comissao: 0.00 },
    { id: '36', nome: 'Eric Monteiro Souza', email: 'ericmonteiro@gmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: true, saldo: 0.00, depositos: 950.00, trades: 13, comissao: 0.00 },
    // Nov 18 — 4 sem FTD
    { id: '37', nome: 'Elisa Carvalho Pereira', email: 'elisacarvalho@gmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '38', nome: 'Jessica Freitas Almeida', email: 'jessicafreitas@gmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '39', nome: 'Claudio Teixeira Lopes', email: 'claudioteixeira@gmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '40', nome: 'Karla Vieira Santos', email: 'karlavieira@hotmail.com', tipo: 'Lead', data_registro: '18/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 17 — 6 FTD
    { id: '41', nome: 'Marcos Gomes Rodrigues', email: 'marcosgomes@gmail.com', tipo: 'Lead', data_registro: '17/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 17, comissao: 0.00 },
    { id: '42', nome: 'Bruna Moreira Costa', email: 'brunamoreira@gmail.com', tipo: 'Lead', data_registro: '17/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 9, comissao: 0.00 },
    { id: '43', nome: 'Alexandre Melo Campos', email: 'alexmelo@gmail.com', tipo: 'Lead', data_registro: '17/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 12, comissao: 0.00 },
    { id: '44', nome: 'Patricia Lima Souza', email: 'patricialima22@gmail.com', tipo: 'Lead', data_registro: '17/11/2025', ftd: true, saldo: 110.40, depositos: 1100.00, trades: 15, comissao: 0.00 },
    { id: '45', nome: 'Daniel Cardoso Vieira', email: 'danielcardoso@gmail.com', tipo: 'Lead', data_registro: '17/11/2025', ftd: true, saldo: 0.00, depositos: 960.00, trades: 11, comissao: 0.00 },
    { id: '46', nome: 'Gabriela Barros Costa', email: 'gabrielabarros@gmail.com', tipo: 'Lead', data_registro: '17/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 14, comissao: 0.00 },
    // Nov 17 — 4 sem FTD
    { id: '47', nome: 'Roberto Pereira Santos', email: 'robertopereira@hotmail.com', tipo: 'Lead', data_registro: '17/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '48', nome: 'Ana Clara Rodrigues', email: 'anaclara.rodrigues@gmail.com', tipo: 'Lead', data_registro: '17/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '49', nome: 'Felipe Machado Lima', email: 'felipemachado@gmail.com', tipo: 'Lead', data_registro: '17/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '50', nome: 'Juliana Campos Martins', email: 'julianacampos@gmail.com', tipo: 'Lead', data_registro: '17/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 16 — 2 FTD
    { id: '51', nome: 'Lucas Vieira Barbosa', email: 'lucasvieira@gmail.com', tipo: 'Lead', data_registro: '16/11/2025', ftd: true, saldo: 0.00, depositos: 950.00, trades: 8, comissao: 0.00 },
    { id: '52', nome: 'Natalia Rocha Ferreira', email: 'nataliarocha@hotmail.com', tipo: 'Lead', data_registro: '16/11/2025', ftd: true, saldo: 0.00, depositos: 950.00, trades: 11, comissao: 0.00 },
    // Nov 16 — 1 sem FTD
    { id: '53', nome: 'Rodrigo Alves Carvalho', email: 'rodrigoalves@gmail.com', tipo: 'Lead', data_registro: '16/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 15 — 3 FTD
    { id: '54', nome: 'Amanda Santos Lopes', email: 'amandasantos@gmail.com', tipo: 'Lead', data_registro: '15/11/2025', ftd: true, saldo: 0.00, depositos: 1200.00, trades: 16, comissao: 0.00 },
    { id: '55', nome: 'Bruno Freitas Monteiro', email: 'brunofreitas@gmail.com', tipo: 'Lead', data_registro: '15/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 10, comissao: 0.00 },
    { id: '56', nome: 'Larissa Costa Oliveira', email: 'larissacosta@hotmail.com', tipo: 'Lead', data_registro: '15/11/2025', ftd: true, saldo: 0.00, depositos: 750.00, trades: 7, comissao: 0.00 },
    // Nov 15 — 2 sem FTD
    { id: '57', nome: 'Gustavo Ribeiro Souza', email: 'gustavoribeir@gmail.com', tipo: 'Lead', data_registro: '15/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '58', nome: 'Eduardo Mendes Costa', email: 'eduardomendesc@gmail.com', tipo: 'Lead', data_registro: '15/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 14 — 8 FTD
    { id: '59', nome: 'Priscila Teixeira Lima', email: 'priscilat@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: true, saldo: 0.00, depositos: 1200.00, trades: 18, comissao: 0.00 },
    { id: '60', nome: 'Marcelo Rodrigues Santos', email: 'marcelorodrigues@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 13, comissao: 0.00 },
    { id: '61', nome: 'Stephanie Oliveira Barros', email: 'stephanieoliveira@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: true, saldo: 0.00, depositos: 1100.00, trades: 9, comissao: 0.00 },
    { id: '62', nome: 'Vinicius Carvalho Pereira', email: 'viniciuscarvalho@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: true, saldo: 145.60, depositos: 900.00, trades: 22, comissao: 0.00 },
    { id: '63', nome: 'Renata Campos Vieira', email: 'renatacampos@hotmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: true, saldo: 0.00, depositos: 1050.00, trades: 15, comissao: 0.00 },
    { id: '64', nome: 'Diego Ferreira Lima', email: 'diegoferre@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: true, saldo: 0.00, depositos: 780.00, trades: 11, comissao: 0.00 },
    { id: '65', nome: 'Fernanda Alves Rocha', email: 'fernandaalves@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: true, saldo: 0.00, depositos: 950.00, trades: 14, comissao: 0.00 },
    { id: '66', nome: 'Paulo Henrique Correia', email: 'pauloh.correia@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: true, saldo: 0.00, depositos: 1060.00, trades: 19, comissao: 0.00 },
    // Nov 14 — 4 sem FTD
    { id: '67', nome: 'Mariana Souza Costa', email: 'marianasouza@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '68', nome: 'Carlos Eduardo Melo', email: 'carlosemelo@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '69', nome: 'Beatriz Lima Ferreira', email: 'beatrizlima@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '70', nome: 'Thiago Barbosa Correia', email: 'thiagobarbosa2@gmail.com', tipo: 'Lead', data_registro: '14/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 13 — 6 FTD
    { id: '71', nome: 'Camila Alves Santos', email: 'camilaalves@gmail.com', tipo: 'Lead', data_registro: '13/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 13, comissao: 0.00 },
    { id: '72', nome: 'Leandro Gomes Vieira', email: 'leandrogomes@gmail.com', tipo: 'Lead', data_registro: '13/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 9, comissao: 0.00 },
    { id: '73', nome: 'Rafaela Martins Costa', email: 'rafaelamartins@hotmail.com', tipo: 'Lead', data_registro: '13/11/2025', ftd: true, saldo: 0.00, depositos: 1100.00, trades: 16, comissao: 0.00 },
    { id: '74', nome: 'Lucas Cardoso Pereira', email: 'lucascardoso@gmail.com', tipo: 'Lead', data_registro: '13/11/2025', ftd: true, saldo: 75.20, depositos: 950.00, trades: 12, comissao: 0.00 },
    { id: '75', nome: 'Fabio Lopes Barbosa', email: 'fabiolopes@gmail.com', tipo: 'Lead', data_registro: '13/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 10, comissao: 0.00 },
    { id: '76', nome: 'Patricia Oliveira Lima', email: 'patriciaoliveira@gmail.com', tipo: 'Lead', data_registro: '13/11/2025', ftd: true, saldo: 0.00, depositos: 950.00, trades: 8, comissao: 0.00 },
    // Nov 13 — 3 sem FTD
    { id: '77', nome: 'Adriano Monteiro Souza', email: 'adrianomonteiro@gmail.com', tipo: 'Lead', data_registro: '13/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '78', nome: 'Carolina Barros Santos', email: 'carolinabarros@hotmail.com', tipo: 'Lead', data_registro: '13/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '79', nome: 'Marco Silva Rodrigues', email: 'marcosilva@gmail.com', tipo: 'Lead', data_registro: '13/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 12 — 7 FTD
    { id: '80', nome: 'Bianca Pereira Costa', email: 'biancapereira@gmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 10, comissao: 0.00 },
    { id: '81', nome: 'Victor Carvalho Campos', email: 'victorcarvalho@gmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: true, saldo: 0.00, depositos: 1200.00, trades: 18, comissao: 0.00 },
    { id: '82', nome: 'Daniela Ferreira Martins', email: 'danielaferreira@gmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 9, comissao: 0.00 },
    { id: '83', nome: 'Ricardo Nascimento Lima', email: 'ricardonascimento@gmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: true, saldo: 90.10, depositos: 980.00, trades: 14, comissao: 0.00 },
    { id: '84', nome: 'Elaine Rodrigues Gomes', email: 'elainerodr@hotmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: true, saldo: 0.00, depositos: 750.00, trades: 7, comissao: 0.00 },
    { id: '85', nome: 'Wagner Teixeira Santos', email: 'wagnerteixeira@gmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 15, comissao: 0.00 },
    { id: '86', nome: 'Ingrid Souza Moreira', email: 'ingridssouza@gmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: true, saldo: 0.00, depositos: 950.00, trades: 11, comissao: 0.00 },
    // Nov 12 — 4 sem FTD
    { id: '87', nome: 'Davi Barbosa Pereira', email: 'davibarb@gmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '88', nome: 'Gisele Lima Almeida', email: 'giselealmeida@gmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '89', nome: 'Kaio Martins Vieira', email: 'kaiomart@gmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '90', nome: 'Helena Santos Correia', email: 'helenasantos@gmail.com', tipo: 'Lead', data_registro: '12/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 11 — 5 FTD
    { id: '91', nome: 'Ivan Rodrigues Lima', email: 'ivanrodrigues@hotmail.com', tipo: 'Lead', data_registro: '11/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 9, comissao: 0.00 },
    { id: '92', nome: 'Flavia Oliveira Costa', email: 'flaviaoliveira@gmail.com', tipo: 'Lead', data_registro: '11/11/2025', ftd: true, saldo: 0.00, depositos: 1200.00, trades: 15, comissao: 0.00 },
    { id: '93', nome: 'Alan Pereira Barbosa', email: 'alanpereira@gmail.com', tipo: 'Lead', data_registro: '11/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 12, comissao: 0.00 },
    { id: '94', nome: 'Monica Campos Santos', email: 'monicacampos@gmail.com', tipo: 'Lead', data_registro: '11/11/2025', ftd: true, saldo: 55.30, depositos: 900.00, trades: 8, comissao: 0.00 },
    { id: '95', nome: 'Hugo Ferreira Lima', email: 'hugoferreira@gmail.com', tipo: 'Lead', data_registro: '11/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 11, comissao: 0.00 },
    // Nov 11 — 3 sem FTD
    { id: '96', nome: 'Josiane Carvalho Moreira', email: 'josianec@hotmail.com', tipo: 'Lead', data_registro: '11/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '97', nome: 'Mario Costa Nascimento', email: 'mariocosta@gmail.com', tipo: 'Lead', data_registro: '11/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '98', nome: 'Aline Vieira Santos', email: 'alinevieira@gmail.com', tipo: 'Lead', data_registro: '11/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 10 — 7 FTD
    { id: '99', nome: 'Jorge Almeida Rodrigues', email: 'jorgealmeida@gmail.com', tipo: 'Lead', data_registro: '10/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 16, comissao: 0.00 },
    { id: '100', nome: 'Barbara Barbosa Costa', email: 'barbarabarb@gmail.com', tipo: 'Lead', data_registro: '10/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 12, comissao: 0.00 },
    { id: '101', nome: 'Luis Teixeira Martins', email: 'luisteixeira@gmail.com', tipo: 'Lead', data_registro: '10/11/2025', ftd: true, saldo: 0.00, depositos: 1100.00, trades: 19, comissao: 0.00 },
    { id: '102', nome: 'Cecilia Souza Lima', email: 'cecilias@hotmail.com', tipo: 'Lead', data_registro: '10/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 8, comissao: 0.00 },
    { id: '103', nome: 'Renato Cardoso Vieira', email: 'renatocardoso@gmail.com', tipo: 'Lead', data_registro: '10/11/2025', ftd: true, saldo: 120.40, depositos: 1050.00, trades: 15, comissao: 0.00 },
    { id: '104', nome: 'Debora Lopes Pereira', email: 'deboral@gmail.com', tipo: 'Lead', data_registro: '10/11/2025', ftd: true, saldo: 0.00, depositos: 850.00, trades: 10, comissao: 0.00 },
    { id: '105', nome: 'Eric Barros Campos', email: 'ericbarros@gmail.com', tipo: 'Lead', data_registro: '10/11/2025', ftd: true, saldo: 0.00, depositos: 950.00, trades: 14, comissao: 0.00 },
    // Nov 10 — 3 sem FTD
    { id: '106', nome: 'Elisa Santos Correia', email: 'elisasantos@gmail.com', tipo: 'Lead', data_registro: '10/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '107', nome: 'Ivan Rodrigues Costa', email: 'ivanr.costa@gmail.com', tipo: 'Lead', data_registro: '10/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '108', nome: 'Jessica Moreira Lima', email: 'jessicamoreira@hotmail.com', tipo: 'Lead', data_registro: '10/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 9 — 2 FTD
    { id: '109', nome: 'Claudio Gomes Rodrigues', email: 'claudiogomes@gmail.com', tipo: 'Lead', data_registro: '09/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 11, comissao: 0.00 },
    { id: '110', nome: 'Karla Ferreira Barros', email: 'karlaferreira@gmail.com', tipo: 'Lead', data_registro: '09/11/2025', ftd: true, saldo: 0.00, depositos: 1100.00, trades: 9, comissao: 0.00 },
    // Nov 9 — 1 sem FTD
    { id: '111', nome: 'Marcos Santos Oliveira', email: 'marcossantos@gmail.com', tipo: 'Lead', data_registro: '09/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 8 — 2 FTD
    { id: '112', nome: 'Bruna Pereira Lima', email: 'brunapereir@gmail.com', tipo: 'Lead', data_registro: '08/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 7, comissao: 0.00 },
    { id: '113', nome: 'Alexandre Rodrigues Costa', email: 'alexandrerod@hotmail.com', tipo: 'Lead', data_registro: '08/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 13, comissao: 0.00 },
    // Nov 8 — 2 sem FTD
    { id: '114', nome: 'Patricia Martins Campos', email: 'patriciamartins2@gmail.com', tipo: 'Lead', data_registro: '08/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '115', nome: 'Daniel Oliveira Pereira', email: 'danieloliveira@gmail.com', tipo: 'Lead', data_registro: '08/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 7 — 5 FTD
    { id: '116', nome: 'Gabriela Costa Santos', email: 'gabrielacosta@gmail.com', tipo: 'Lead', data_registro: '07/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 14, comissao: 0.00 },
    { id: '117', nome: 'Roberto Lima Barbosa', email: 'robertolima@gmail.com', tipo: 'Lead', data_registro: '07/11/2025', ftd: true, saldo: 0.00, depositos: 1050.00, trades: 11, comissao: 0.00 },
    { id: '118', nome: 'Ana Rodrigues Correia', email: 'anarodrigues@hotmail.com', tipo: 'Lead', data_registro: '07/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 8, comissao: 0.00 },
    { id: '119', nome: 'Felipe Campos Lima', email: 'felipecampos@gmail.com', tipo: 'Lead', data_registro: '07/11/2025', ftd: true, saldo: 85.60, depositos: 1000.00, trades: 16, comissao: 0.00 },
    { id: '120', nome: 'Juliana Vieira Santos', email: 'julianavieira@gmail.com', tipo: 'Lead', data_registro: '07/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 10, comissao: 0.00 },
    // Nov 7 — 3 sem FTD
    { id: '121', nome: 'Lucas Ferreira Martins', email: 'lucasferreira@hotmail.com', tipo: 'Lead', data_registro: '07/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '122', nome: 'Natalia Barbosa Oliveira', email: 'nataliabarb@gmail.com', tipo: 'Lead', data_registro: '07/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '123', nome: 'Rodrigo Santos Costa', email: 'rodrigosantos@gmail.com', tipo: 'Lead', data_registro: '07/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 6 — 7 FTD
    { id: '124', nome: 'Amanda Pereira Lima', email: 'amandapereira@gmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 12, comissao: 0.00 },
    { id: '125', nome: 'Bruno Rodrigues Campos', email: 'brunorodrigues@hotmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: true, saldo: 0.00, depositos: 1100.00, trades: 17, comissao: 0.00 },
    { id: '126', nome: 'Larissa Lima Vieira', email: 'larissalima@gmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 9, comissao: 0.00 },
    { id: '127', nome: 'Gustavo Costa Santos', email: 'gustavocosta@gmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 11, comissao: 0.00 },
    { id: '128', nome: 'Eduardo Ferreira Barbosa', email: 'eduardoferreira@gmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 15, comissao: 0.00 },
    { id: '129', nome: 'Priscila Santos Oliveira', email: 'priscilasantos@hotmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: true, saldo: 0.00, depositos: 950.00, trades: 8, comissao: 0.00 },
    { id: '130', nome: 'Marcelo Lima Martins', email: 'marcelolima@gmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 13, comissao: 0.00 },
    // Nov 6 — 4 sem FTD
    { id: '131', nome: 'Stephanie Rodrigues Costa', email: 'stephanier@gmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '132', nome: 'Vinicius Santos Pereira', email: 'viniciussantos@gmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '133', nome: 'Renata Lima Barbosa', email: 'renatalimab@hotmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '134', nome: 'Diego Santos Campos', email: 'diegosantosc@gmail.com', tipo: 'Lead', data_registro: '06/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 5 — 6 FTD
    { id: '135', nome: 'Fernanda Santos Lima', email: 'fernandasantos@gmail.com', tipo: 'Lead', data_registro: '05/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 10, comissao: 0.00 },
    { id: '136', nome: 'Paulo Costa Rodrigues', email: 'paulocosta@gmail.com', tipo: 'Lead', data_registro: '05/11/2025', ftd: true, saldo: 0.00, depositos: 1100.00, trades: 16, comissao: 0.00 },
    { id: '137', nome: 'Mariana Lima Santos', email: 'marianalima@hotmail.com', tipo: 'Lead', data_registro: '05/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 8, comissao: 0.00 },
    { id: '138', nome: 'Carlos Pereira Costa', email: 'carlospereir@gmail.com', tipo: 'Lead', data_registro: '05/11/2025', ftd: true, saldo: 0.00, depositos: 950.00, trades: 13, comissao: 0.00 },
    { id: '139', nome: 'Beatriz Rodrigues Lima', email: 'beatrizrodr@gmail.com', tipo: 'Lead', data_registro: '05/11/2025', ftd: true, saldo: 70.20, depositos: 930.00, trades: 11, comissao: 0.00 },
    { id: '140', nome: 'Thiago Santos Campos', email: 'thiagosantos2@gmail.com', tipo: 'Lead', data_registro: '05/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 9, comissao: 0.00 },
    // Nov 5 — 3 sem FTD
    { id: '141', nome: 'Camila Lima Ferreira', email: 'camilalima@gmail.com', tipo: 'Lead', data_registro: '05/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '142', nome: 'Leandro Costa Pereira', email: 'leandrocosta@hotmail.com', tipo: 'Lead', data_registro: '05/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '143', nome: 'Rafaela Santos Barbosa', email: 'rafaelasantos@gmail.com', tipo: 'Lead', data_registro: '05/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 4 — 8 FTD
    { id: '144', nome: 'Lucas Lima Rodrigues', email: 'lucaslima@gmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 9, comissao: 0.00 },
    { id: '145', nome: 'Fabio Costa Santos', email: 'fabiocosta@gmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 15, comissao: 0.00 },
    { id: '146', nome: 'Patricia Pereira Lima', email: 'patriciapereira2@gmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 11, comissao: 0.00 },
    { id: '147', nome: 'Adriano Santos Correia', email: 'adrianossantos@gmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: true, saldo: 0.00, depositos: 750.00, trades: 8, comissao: 0.00 },
    { id: '148', nome: 'Carolina Lima Costa', email: 'carolinalima@hotmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: true, saldo: 0.00, depositos: 1200.00, trades: 18, comissao: 0.00 },
    { id: '149', nome: 'Marco Rodrigues Pereira', email: 'marcorod@gmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: true, saldo: 0.00, depositos: 700.00, trades: 7, comissao: 0.00 },
    { id: '150', nome: 'Bianca Santos Lima', email: 'biancasantos@gmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 10, comissao: 0.00 },
    { id: '151', nome: 'Victor Costa Campos', email: 'victorcosta@gmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: true, saldo: 0.00, depositos: 850.00, trades: 13, comissao: 0.00 },
    // Nov 4 — 4 sem FTD
    { id: '152', nome: 'Daniela Lima Barbosa', email: 'danielalima@hotmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '153', nome: 'Ricardo Santos Vieira', email: 'ricardosantos@gmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '154', nome: 'Elaine Lima Rodrigues', email: 'elaineliima@gmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '155', nome: 'Wagner Santos Costa', email: 'wagnersantos@gmail.com', tipo: 'Lead', data_registro: '04/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 3 — 6 FTD
    { id: '156', nome: 'Ingrid Lima Pereira', email: 'ingridlima@gmail.com', tipo: 'Lead', data_registro: '03/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 12, comissao: 0.00 },
    { id: '157', nome: 'Davi Santos Campos', email: 'davisantos@gmail.com', tipo: 'Lead', data_registro: '03/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 9, comissao: 0.00 },
    { id: '158', nome: 'Gisele Lima Correia', email: 'giselereq@hotmail.com', tipo: 'Lead', data_registro: '03/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 14, comissao: 0.00 },
    { id: '159', nome: 'Kaio Costa Santos', email: 'kaiocosta@gmail.com', tipo: 'Lead', data_registro: '03/11/2025', ftd: true, saldo: 0.00, depositos: 800.00, trades: 8, comissao: 0.00 },
    { id: '160', nome: 'Helena Lima Barbosa', email: 'helenalima@gmail.com', tipo: 'Lead', data_registro: '03/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 11, comissao: 0.00 },
    { id: '161', nome: 'Ivan Santos Rodrigues', email: 'ivansantos2@gmail.com', tipo: 'Lead', data_registro: '03/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 10, comissao: 0.00 },
    // Nov 3 — 4 sem FTD
    { id: '162', nome: 'Flavia Lima Costa', email: 'flavialima@gmail.com', tipo: 'Lead', data_registro: '03/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '163', nome: 'Alan Santos Pereira', email: 'alansantos@gmail.com', tipo: 'Lead', data_registro: '03/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '164', nome: 'Monica Lima Ferreira', email: 'monicalima@hotmail.com', tipo: 'Lead', data_registro: '03/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '165', nome: 'Hugo Santos Costa', email: 'hugosantos@gmail.com', tipo: 'Lead', data_registro: '03/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 2 — 2 FTD
    { id: '166', nome: 'Josiane Lima Rodrigues', email: 'josianelima@gmail.com', tipo: 'Lead', data_registro: '02/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 8, comissao: 0.00 },
    { id: '167', nome: 'Mario Santos Pereira', email: 'mariosantos@gmail.com', tipo: 'Lead', data_registro: '02/11/2025', ftd: true, saldo: 0.00, depositos: 900.00, trades: 11, comissao: 0.00 },
    // Nov 2 — 2 sem FTD
    { id: '168', nome: 'Aline Lima Costa', email: 'alinelima@hotmail.com', tipo: 'Lead', data_registro: '02/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '169', nome: 'Jorge Santos Lima', email: 'jorgesantos@gmail.com', tipo: 'Lead', data_registro: '02/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    // Nov 1 — 3 FTD
    { id: '170', nome: 'Barbara Lima Pereira', email: 'barbaralima@gmail.com', tipo: 'Lead', data_registro: '01/11/2025', ftd: true, saldo: 0.00, depositos: 1050.00, trades: 14, comissao: 0.00 },
    { id: '171', nome: 'Luis Santos Rodrigues', email: 'luissantos@gmail.com', tipo: 'Lead', data_registro: '01/11/2025', ftd: true, saldo: 0.00, depositos: 1000.00, trades: 10, comissao: 0.00 },
    { id: '172', nome: 'Cecilia Lima Costa', email: 'cecilialima@hotmail.com', tipo: 'Lead', data_registro: '01/11/2025', ftd: true, saldo: 0.00, depositos: 1100.00, trades: 13, comissao: 0.00 },
    // Nov 1 — 2 sem FTD
    { id: '173', nome: 'Renato Santos Pereira', email: 'renatosantos@gmail.com', tipo: 'Lead', data_registro: '01/11/2025', ftd: false, saldo: 0.00, depositos: 0.00, trades: 0, comissao: 0.00 },
    { id: '174', nome: 'Tiago Rodrigues Moura', email: 'tagormoura182@gmail.com', tipo: 'Lead', data_registro: '01/11/2025', ftd: true, saldo: 0.00, depositos: 300.00, trades: 0, comissao: 0.00 },
  ],
  estatisticas: {
    registros: 174,
    ftds: 109,
    depositos: 103274.80,
    trades: 7897,
    comissao_total: 18129.60,
    grafico: [
      { data: '01/11', valor: 226.80 },
      { data: '02/11', valor: 129.60 },
      { data: '03/11', valor: 388.80 },
      { data: '04/11', valor: 504.00 },
      { data: '05/11', valor: 401.76 },
      { data: '06/11', valor: 464.40 },
      { data: '07/11', valor: 342.00 },
      { data: '08/11', valor: 136.80 },
      { data: '09/11', valor: 151.20 },
      { data: '10/11', valor: 478.80 },
      { data: '11/11', valor: 345.60 },
      { data: '12/11', valor: 473.76 },
      { data: '13/11', valor: 410.40 },
      { data: '14/11', valor: 564.48 },
      { data: '15/11', valor: 205.20 },
      { data: '16/11', valor: 136.80 },
      { data: '17/11', valor: 414.72 },
      { data: '18/11', valor: 478.80 },
      { data: '19/11', valor: 342.00 },
      { data: '20/11', valor: 483.84 },
      { data: '21/11', valor: 356.03 },
    ],
    detalhamento: [
      { data: '21/11/2025', registros: 9, ftds: 5, qtd_dep: 5, depositos: 4944.80, trades: 65, comissao: 356.03 },
      { data: '20/11/2025', registros: 12, ftds: 7, qtd_dep: 7, depositos: 6720.00, trades: 85, comissao: 483.84 },
      { data: '19/11/2025', registros: 8, ftds: 5, qtd_dep: 5, depositos: 4750.00, trades: 63, comissao: 342.00 },
      { data: '18/11/2025', registros: 11, ftds: 7, qtd_dep: 7, depositos: 6650.00, trades: 81, comissao: 478.80 },
      { data: '17/11/2025', registros: 10, ftds: 6, qtd_dep: 6, depositos: 5760.00, trades: 78, comissao: 414.72 },
      { data: '16/11/2025', registros: 3, ftds: 2, qtd_dep: 2, depositos: 1900.00, trades: 19, comissao: 136.80 },
      { data: '15/11/2025', registros: 5, ftds: 3, qtd_dep: 3, depositos: 2850.00, trades: 33, comissao: 205.20 },
      { data: '14/11/2025', registros: 12, ftds: 8, qtd_dep: 8, depositos: 7840.00, trades: 102, comissao: 564.48 },
      { data: '13/11/2025', registros: 9, ftds: 6, qtd_dep: 6, depositos: 5700.00, trades: 68, comissao: 410.40 },
      { data: '12/11/2025', registros: 11, ftds: 7, qtd_dep: 7, depositos: 6580.00, trades: 84, comissao: 473.76 },
      { data: '11/11/2025', registros: 8, ftds: 5, qtd_dep: 5, depositos: 4800.00, trades: 55, comissao: 345.60 },
      { data: '10/11/2025', registros: 10, ftds: 7, qtd_dep: 7, depositos: 6650.00, trades: 94, comissao: 478.80 },
      { data: '09/11/2025', registros: 3, ftds: 2, qtd_dep: 2, depositos: 2100.00, trades: 20, comissao: 151.20 },
      { data: '08/11/2025', registros: 4, ftds: 2, qtd_dep: 2, depositos: 1900.00, trades: 20, comissao: 136.80 },
      { data: '07/11/2025', registros: 8, ftds: 5, qtd_dep: 5, depositos: 4750.00, trades: 59, comissao: 342.00 },
      { data: '06/11/2025', registros: 11, ftds: 7, qtd_dep: 7, depositos: 6450.00, trades: 85, comissao: 464.40 },
      { data: '05/11/2025', registros: 9, ftds: 6, qtd_dep: 6, depositos: 5580.00, trades: 67, comissao: 401.76 },
      { data: '04/11/2025', registros: 12, ftds: 8, qtd_dep: 8, depositos: 7000.00, trades: 91, comissao: 504.00 },
      { data: '03/11/2025', registros: 10, ftds: 6, qtd_dep: 6, depositos: 5400.00, trades: 64, comissao: 388.80 },
      { data: '02/11/2025', registros: 4, ftds: 2, qtd_dep: 2, depositos: 1800.00, trades: 19, comissao: 129.60 },
      { data: '01/11/2025', registros: 5, ftds: 3, qtd_dep: 3, depositos: 3150.00, trades: 45, comissao: 226.80 },
    ],
  },
  saques: {
    disponivel_lead: 0.46,
    disponivel_sub: 0.0,
    saldo_liberar_lead: 0.0,
    saldo_liberar_sub: 0.0,
    proxima_liberacao: 'Terça-Feira, 28/04/2026',
    requisito_ftds: 0,
    ftds_atual: 109,
    historico: [
      { id: '1', data: '23/04/2026', metodo: 'PIX', status: 'Concluído', valor: 116.0 },
      { id: '2', data: '21/04/2026', metodo: 'PIX', status: 'Rejeitado', valor: 116.0 },
      { id: '3', data: '14/04/2026', metodo: 'PIX', status: 'Concluído', valor: 73.0 },
      { id: '4', data: '24/03/2026', metodo: 'PIX', status: 'Concluído', valor: 84.0 },
      { id: '5', data: '10/03/2026', metodo: 'PIX', status: 'Concluído', valor: 520.0 },
      { id: '6', data: '25/02/2026', metodo: 'PIX', status: 'Concluído', valor: 843.0 },
      { id: '7', data: '10/02/2026', metodo: 'PIX', status: 'Concluído', valor: 1250.0 },
      { id: '8', data: '27/01/2026', metodo: 'PIX', status: 'Concluído', valor: 875.0 },
      { id: '9', data: '13/01/2026', metodo: 'PIX', status: 'Concluído', valor: 1120.0 },
      { id: '10', data: '30/12/2025', metodo: 'PIX', status: 'Concluído', valor: 1890.0 },
      { id: '11', data: '16/12/2025', metodo: 'PIX', status: 'Concluído', valor: 2340.0 },
      { id: '12', data: '02/12/2025', metodo: 'PIX', status: 'Concluído', valor: 1780.0 },
      { id: '13', data: '18/11/2025', metodo: 'PIX', status: 'Concluído', valor: 2150.0 },
      { id: '14', data: '04/11/2025', metodo: 'PIX', status: 'Concluído', valor: 1620.0 },
      { id: '15', data: '21/10/2025', metodo: 'PIX', status: 'Concluído', valor: 1380.0 },
      { id: '16', data: '07/10/2025', metodo: 'PIX', status: 'Concluído', valor: 1490.0 },
      { id: '17', data: '23/09/2025', metodo: 'PIX', status: 'Concluído', valor: 598.14 },
    ],
  },
  convites: {
    total: 1,
    pendentes: 0,
    cadastrados: 1,
    depositaram: 0,
    completos: 0,
    recompensas: 0,
    lista: [
      {
        id: '1',
        convidador_nome: 'Bezerra Nina Raphaella',
        convidador_email: 'nina.raphaella@gmail.com',
        convidado_email: 'phelypebrenno03@gmail.com',
        convidado_nome: 'Phelype Brenno',
        status: 'Cadastrado',
        volume: 0.0,
        meta_volume: 1000.0,
        recompensa: 50.0,
        codigo: 'SPRY4K0TIV',
        enviado: '12/04/2026, 11:28',
      },
    ],
  },
};
