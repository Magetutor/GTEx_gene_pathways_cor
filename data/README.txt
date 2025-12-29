Place your CSV file in this folder with the filename:

  adipose_gene_pathway_cor.csv

The webapp expects a CSV with at least these columns (case-insensitive):
- gene (or symbol, hgnc_symbol, gene_name)
- pathway (or term, gsva, gsva_name, path)
- cor (correlation column name may include 'cor' or 'rho')

Optional columns:
- pval or p_value (for sizing by -log10(p))

If your file is large, it's fine — the browser will load it locally when you open this page on your machine or after hosting the folder on a static server.
