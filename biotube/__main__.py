"""Línea de comandos: python -m biotube <comando>

Comandos principales (en el orden en que se usan):
  auth                     Autoriza tu canal de YouTube (una sola vez, abre el navegador)
  research                 Puntúa los temas pendientes con datos de YouTube
  recommend [--ideas N]    Muestra los mejores temas siguientes (y pide ideas nuevas a Claude)
  generate [--topic T]     Escribe un paquete (documental + shorts) con Claude
  render PKG               Crea los MP4, miniatura y subtítulos
  check PKG                Revisión de monetización (licencias, duración, lenguaje...)
  publish PKG [--dry-run]  Sube y programa en YouTube
  weekly [--packages N]    Todo lo anterior seguido (lo que ejecuta el cron)
  analytics fetch|demo     Descarga métricas reales o genera datos de demo
  dashboard [--demo]       Genera el dashboard HTML

PKG puede ser una ruta (examples/rana-de-cristal.yaml) o el id de un paquete en output/.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .config import load_config


def _load(pkg_arg: str):
    from .store import load_package, package_path

    path = Path(pkg_arg)
    if not path.exists():
        path = package_path(pkg_arg)
    if not path.exists():
        sys.exit(f"No encuentro el paquete '{pkg_arg}'")
    return load_package(path)


def _analysis():
    from .analytics import connect
    from .insights import analyze

    return analyze(connect())


def cmd_auth(_):
    from .youtube_client import get_credentials

    get_credentials(interactive=True)
    print("Autorización guardada. Ya puedes publicar sin navegador.")


def cmd_research(args):
    from .research import research_topics
    from .topics import load_topics

    pending = [t for t in load_topics() if t.status == "pending"][: args.limit]
    print(f"Investigando {len(pending)} temas (~{len(pending) * 103} unidades de cuota)...")
    research_topics(pending)


def cmd_recommend(args):
    from .insights import recommend_topics, suggest_new_topics
    from .research import load_research_scores
    from .topics import load_topics

    analysis = _analysis()
    topics = load_topics()
    print("Siguientes temas recomendados:")
    for r in recommend_topics(analysis, topics, load_research_scores(), n=args.n):
        print(f"  {r['score']:.2f}  {r['topic']}  ({r['category']}/{r['subcategory']})")
    if args.ideas:
        print("\nIdeas nuevas propuestas por Claude:")
        for idea in suggest_new_topics(analysis, [t.topic for t in topics], n=args.ideas):
            print(f"  - {idea.topic} [{idea.category}/{idea.subcategory}] -> {idea.why}")


def generate_one(topic_text: str | None = None):
    from .insights import performance_notes
    from .research import load_research_scores
    from .scriptwriter import create_package
    from .store import save_package
    from .topics import Topic, load_topics, mark_used, pick_next_topic

    analysis = _analysis()
    topics = load_topics()
    if topic_text:
        topic = next((t for t in topics if t.topic == topic_text), None) or Topic(topic_text, "otro", "general")
    else:
        topic = pick_next_topic(
            topics,
            category_weights={k: v["weight"] for k, v in analysis["by_category"].items()},
            subcategory_weights={k: v["weight"] for k, v in analysis["by_subcategory"].items()},
            research_scores=load_research_scores(),
        )
        if topic is None:
            sys.exit("No quedan temas pendientes: añade más en data/topic_bank.yaml o usa 'recommend --ideas'.")
    print(f"Tema: {topic.topic}")
    pkg = create_package(topic, performance_notes(analysis))
    path = save_package(pkg)
    mark_used(topic.topic)
    print(f"Paquete guardado en {path} ({pkg.documentary.word_count} palabras, {len(pkg.shorts)} shorts)")
    return pkg


def cmd_generate(args):
    generate_one(args.topic)


def cmd_render(args):
    from .render import render_package

    if args.placeholder_images:
        load_config()["media"]["providers"] = []
    pkg = render_package(_load(args.package), tts_provider=args.tts, only_shorts=args.only_shorts)
    print(f"Listo: {load_config().path('output') / pkg.id}")


def cmd_check(args):
    from .compliance import check_package, has_blockers

    cfg = load_config()
    issues = check_package(_load(args.package), allowed_licenses=cfg["media"]["allowed_licenses"],
                           min_minutes=cfg["content"]["documentary_minutes"][0], wpm=cfg["content"]["words_per_minute"])
    for i in issues:
        print(f"[{i.severity.upper()}] {i.message}")
    print("BLOQUEADO" if has_blockers(issues) else "OK para publicar")


def cmd_publish(args):
    from .publisher import publish_package

    publish_package(_load(args.package), dry_run=args.dry_run)


def cmd_weekly(args):
    """Pipeline completo. Pensado para ejecutarse 1 vez por semana (cron / GitHub Actions)."""
    from .analytics import fetch_stats
    from .publisher import publish_package
    from .render import render_package

    if not args.skip_fetch:
        try:
            print(f"Métricas actualizadas: {fetch_stats()} filas")
        except Exception as e:
            print(f"[aviso] no se pudieron descargar métricas: {e}")
    for _ in range(args.packages):
        pkg = generate_one()
        pkg = render_package(pkg)
        publish_package(pkg, dry_run=args.dry_run)


def cmd_analytics(args):
    from .analytics import fetch_stats, generate_demo_data

    if args.action == "fetch":
        print(f"{fetch_stats(days=args.days)} filas guardadas")
    else:
        print(f"Datos de demo en {generate_demo_data()}")


def cmd_dashboard(args):
    from .analytics import connect
    from .dashboard import build_dashboard

    cfg = load_config()
    db = cfg.path("database").with_name("demo.db") if args.demo else cfg.path("database")
    if args.demo and not db.exists():
        from .analytics import generate_demo_data

        generate_demo_data()
    out = Path(args.out) if args.out else cfg.path("output") / ("dashboard_demo.html" if args.demo else "dashboard.html")
    print(f"Dashboard: {build_dashboard(connect(db), out, demo=args.demo)}")


def main(argv=None):
    p = argparse.ArgumentParser(prog="biotube", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("auth").set_defaults(func=cmd_auth)
    s = sub.add_parser("research"); s.add_argument("--limit", type=int, default=20); s.set_defaults(func=cmd_research)
    s = sub.add_parser("recommend"); s.add_argument("-n", type=int, default=5); s.add_argument("--ideas", type=int, default=0)
    s.set_defaults(func=cmd_recommend)
    s = sub.add_parser("generate"); s.add_argument("--topic"); s.set_defaults(func=cmd_generate)
    s = sub.add_parser("render"); s.add_argument("package"); s.add_argument("--tts", choices=["edge", "silent"])
    s.add_argument("--only-shorts", action="store_true")
    s.add_argument("--placeholder-images", action="store_true", help="no descargar imágenes (pruebas sin red)")
    s.set_defaults(func=cmd_render)
    s = sub.add_parser("check"); s.add_argument("package"); s.set_defaults(func=cmd_check)
    s = sub.add_parser("publish"); s.add_argument("package"); s.add_argument("--dry-run", action="store_true")
    s.set_defaults(func=cmd_publish)
    s = sub.add_parser("weekly"); s.add_argument("--packages", type=int, default=load_config()["schedule"]["packages_per_week"])
    s.add_argument("--dry-run", action="store_true"); s.add_argument("--skip-fetch", action="store_true")
    s.set_defaults(func=cmd_weekly)
    s = sub.add_parser("analytics"); s.add_argument("action", choices=["fetch", "demo"]); s.add_argument("--days", type=int, default=90)
    s.set_defaults(func=cmd_analytics)
    s = sub.add_parser("dashboard"); s.add_argument("--demo", action="store_true"); s.add_argument("--out")
    s.set_defaults(func=cmd_dashboard)

    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
