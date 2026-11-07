"""Apaga do banco LOCAL os dados fictícios do vídeo (criados por criar-dados-video.py), para criar de novo do zero.

Uso:  python docs/videos/apagar-dados-video.py
Só mexe na Escola Municipal Cecília Meireles, nas contas @ceciliameireles.test / @espacoaprender.test, nos responsáveis
@exemplo.test do vídeo e nos alunos/pacientes deles. Roda o SQL dentro do container do MySQL (docker compose no ar).
"""
import subprocess
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SQL = r"""
SET FOREIGN_KEY_CHECKS = 0;
SET @e := (SELECT id FROM escolas WHERE slug = 'ceciliaMeireles');
CREATE TEMPORARY TABLE v_usu AS SELECT id FROM usuarios WHERE email LIKE '%@ceciliameireles.test' OR email LIKE '%@espacoaprender.test'
  OR email IN ('carla.souza@exemplo.test','patricia.moreira@exemplo.test','rodrigo.lopes@exemplo.test','fernanda.castro@exemplo.test','luciana.vieira@exemplo.test');
CREATE TEMPORARY TABLE v_alu AS SELECT id FROM alunos WHERE escola_id = @e OR professor_id IN (SELECT id FROM v_usu);
CREATE TEMPORARY TABLE v_par AS SELECT id FROM partidas WHERE escola_id = @e OR aluno_id IN (SELECT id FROM v_alu);
CREATE TEMPORARY TABLE v_com AS SELECT id FROM competicoes WHERE escola_id = @e OR autor_id IN (SELECT id FROM v_usu);
CREATE TEMPORARY TABLE v_que AS SELECT id FROM questionarios WHERE escola_id = @e OR autor_id IN (SELECT id FROM v_usu);
CREATE TEMPORARY TABLE v_tur AS SELECT id FROM turmas WHERE escola_id = @e OR criada_por IN (SELECT id FROM v_usu);
DELETE FROM partida_habilidades WHERE partida_id IN (SELECT id FROM v_par);
DELETE FROM partidas WHERE id IN (SELECT id FROM v_par);
DELETE FROM participacoes WHERE competicao_id IN (SELECT id FROM v_com);
DELETE FROM competicoes WHERE id IN (SELECT id FROM v_com);
DELETE FROM perguntas WHERE questionario_id IN (SELECT id FROM v_que);
DELETE FROM questionarios WHERE id IN (SELECT id FROM v_que);
DELETE FROM plano_sessoes WHERE aluno_id IN (SELECT id FROM v_alu);
DELETE FROM planos_objetivos WHERE aluno_id IN (SELECT id FROM v_alu);
DELETE FROM anamneses WHERE aluno_id IN (SELECT id FROM v_alu);
DELETE FROM anamnese_modelos WHERE escola_id = @e OR autor_id IN (SELECT id FROM v_usu);
DELETE FROM aluno_observacoes WHERE aluno_id IN (SELECT id FROM v_alu);
DELETE FROM recados_familia WHERE aluno_id IN (SELECT id FROM v_alu);
DELETE FROM responsavel_alunos WHERE aluno_id IN (SELECT id FROM v_alu) OR responsavel_id IN (SELECT id FROM v_usu);
DELETE FROM aluno_turmas WHERE aluno_id IN (SELECT id FROM v_alu) OR turma_id IN (SELECT id FROM v_tur);
DELETE FROM alunos WHERE id IN (SELECT id FROM v_alu);
DELETE FROM turma_professores WHERE turma_id IN (SELECT id FROM v_tur) OR usuario_id IN (SELECT id FROM v_usu);
DELETE FROM turmas WHERE id IN (SELECT id FROM v_tur);
DELETE FROM destinatarios WHERE escola_id = @e;
DELETE FROM uso_ia WHERE escola_id = @e OR usuario_id IN (SELECT id FROM v_usu);
DELETE FROM usuarios WHERE id IN (SELECT id FROM v_usu);
DELETE FROM escolas WHERE id = @e;
SET FOREIGN_KEY_CHECKS = 1;
"""

r = subprocess.run(["docker", "exec", "-i", "jogoortografia-mysql-1", "sh", "-c", 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" games 2>&1 | grep -v Warning'],
                   input=SQL.encode("utf-8"), capture_output=True)
saida = r.stdout.decode("utf-8", "replace").strip()
print(saida or "Dados do vídeo apagados.")
sys.exit(1 if "ERROR" in saida else 0)
