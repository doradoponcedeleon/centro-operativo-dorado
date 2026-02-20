# Centro Operativo Dorado

Panel central para gestión de proyectos, bitácora y módulos.

## Estructura
```
centro-operativo-dorado/
├─ index.html
├─ styles.css
├─ app.js
├─ README.md
├─ assets/
└─ modulos/
   ├─ oficina-ideas/
   │  ├─ index.html
   │  ├─ styles.css
   │  └─ app.js
   ├─ mama-salud/
   │  └─ index.html
   ├─ abc-de-vicky/
   │  └─ index.html
   ├─ audio-sagrado/
   │  └─ index.html
   ├─ kits-fisica/
   │  └─ index.html
   └─ maker-lab/
      └─ index.html
```

## Uso local
```sh
cd /data/data/com.termux/files/home/proyectos/centro-operativo-dorado
python3 -m http.server 8090
```
Luego abre: `http://127.0.0.1:8090/`
