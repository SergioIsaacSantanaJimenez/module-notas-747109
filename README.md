# module-notas

Este proyecto implementa un módulo de API RESTful para la gestión de notas de venta. Permite crear, listar, obtener detalles, descargar y reenviar notas. Cada nota de venta genera un documento PDF dinámico que incluye los detalles de la transacción, el cual es almacenado en AWS S3. El módulo utiliza AWS DynamoDB para la persistencia de datos de clientes, domicilios, productos y las notas de venta. Además, interactúa con AWS SNS para la publicación de eventos de notificación (como el envío de correos electrónicos a clientes) y monitorea el rendimiento y el estado HTTP de la API mediante métricas personalizadas enviadas a AWS CloudWatch. Está diseñado para ser desplegado como una función Serverless en AWS Lambda.

## Tecnologías

Las principales tecnologías y servicios utilizados en este proyecto son:

*   **TypeScript**: `^5.4.0`
*   **Node.js**: `18-alpine` (base para la imagen Docker)
*   **AWS Lambda**: Entorno de ejecución Serverless para la API.
*   **AWS API Gateway**: Servicio para exponer la API RESTful.
*   **AWS DynamoDB**: `^3.600.0` Base de datos NoSQL para almacenamiento de datos transaccionales (notas, clientes, productos, domicilios).
*   **AWS S3**: `^3.600.0` Servicio de almacenamiento de objetos para los PDFs generados.
*   **AWS SNS**: `^3.600.0` Servicio de notificación para la publicación de eventos (ej. para enviar emails).
*   **AWS CloudWatch**: `^3.600.0` Servicio de monitoreo para recolectar y visualizar métricas de la API.
*   **PDFKit**: `^0.14.0` Librería para la generación dinámica de documentos PDF.
*   **uuid**: `^9.0.0` Librería para la generación de identificadores únicos.
*   **Docker**: Herramienta para contenerización y despliegue del ambiente de ejecución.

## Prerrequisitos

Para configurar y ejecutar este proyecto, necesitará:

*   Node.js (versión 18 o superior)
*   npm (incluido con Node.js)
*   TypeScript
*   AWS CLI configurado con credenciales y región adecuadas para el despliegue de recursos (DynamoDB, S3, SNS, CloudWatch, Lambda, API Gateway).
*   Docker (opcional, para construir y ejecutar el contenedor localmente o para despliegues como imagen de contenedor en Lambda).

## Cómo instalar

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/SergioIsaacSantanaJimenez/module-notas-747109.git
    cd module-notas-747109
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Compilar el código TypeScript:**
    ```bash
    npm run build
    ```
    Esto generará los archivos JavaScript compilados en la carpeta `dist/`.

## Cómo ejecutar

Aunque el Dockerfile permite la ejecución como un servidor Node.js independiente (`node dist/index.js` exponiendo el puerto 8080), la aplicación está diseñada para operar principalmente como una función AWS Lambda. La ejecución en producción o simulación local requeriría un entorno AWS Lambda o un emulador.

### Ejecución como Función AWS Lambda

Para desplegar y ejecutar este módulo como una función AWS Lambda, se requiere configurar un `serverless.yml` o usar el AWS CLI/CDK para definir la función, el *trigger* (API Gateway) y los permisos IAM necesarios para interactuar con DynamoDB, S3, SNS y CloudWatch.

### Ejecución con Docker (simulando un servidor HTTP)

1.  **Construir la imagen Docker:**
    ```bash
    docker build -t module-notas .
    ```

2.  **Ejecutar el contenedor Docker:**
    ```bash
    docker run -p 8080:8080 -e AWS_REGION=tu-region -e SNS_TOPIC_ARN=tu-sns-arn -e TABLES_NOTAS=tu-tabla-notas -e TABLES_CLIENTES=tu-tabla-clientes -e TABLES_DOMICILIOS=tu-tabla-domicilios -e TABLES_PRODUCTOS=tu-tabla-productos module-notas
    ```
    **Nota:** Esta ejecución local simula un servidor HTTP. Para que la lógica de negocio funcione correctamente, las variables de entorno para las tablas de DynamoDB y el ARN de SNS deben apuntar a recursos AWS reales accesibles desde su entorno, y las peticiones HTTP deberán simular el formato de eventos de API Gateway.

## Estructura del Proyecto

*   `src/`:
    *   `index.ts`: Punto de entrada principal de la función Lambda, gestiona el enrutamiento de las peticiones de API Gateway y publica métricas.
    *   `handlers/`:
        *   `notas.ts`: Contiene la lógica de negocio para todas las operaciones relacionadas con las notas de venta (creación, listado, obtención, descarga, reenvío).
    *   `models/`:
        *   `types.ts`: Define las interfaces y tipos de datos para las entidades del negocio (NotaVenta, Cliente, Domicilio, Producto, etc.).
    *   `services/`:
        *   `dynamoService.ts`: Módulo para la interacción con AWS DynamoDB (CRUD genérico).
        *   `pdfService.ts`: Lógica para la generación de documentos PDF utilizando `pdfkit`.
        *   `s3Service.ts`: Módulo para la interacción con AWS S3 (subida, descarga, gestión de metadatos, URLs pre-firmadas).
    *   `utils/`:
        *   `config.ts`: Define las variables de configuración del proyecto (nombres de tablas, ARN de SNS, región AWS).
        *   `metrics.ts`: Funciones para publicar métricas personalizadas en AWS CloudWatch.
        *   `validators.ts`: Funciones de utilidad para validación de datos y construcción de respuestas/errores de API.
*   `package.json`: Manifiesto del proyecto, scripts y dependencias.
*   `tsconfig.json`: Configuración del compilador TypeScript.
*   `Dockerfile`: Define los pasos para construir la imagen de contenedor Docker del proyecto.
*   `dist/`: Directorio de salida para los archivos JavaScript compilados.

## Habilidades Técnicas Demostradas

Este proyecto demuestra un conjunto robusto de habilidades en el desarrollo de software moderno y arquitecturas Serverless:

*   **Desarrollo de API RESTful**: Diseño e implementación de endpoints API con TypeScript y Node.js.
*   **Arquitectura Serverless en AWS**: Desarrollo y configuración de funciones AWS Lambda.
*   **Integración con Servicios AWS Core**: Utilización avanzada de SDKs de AWS para interactuar con:
    *   **AWS DynamoDB**: Modelado de datos NoSQL y operaciones CRUD eficientes.
    *   **AWS S3**: Almacenamiento y gestión de objetos (PDFs), incluyendo URLs pre-firmadas y metadatos.
    *   **AWS SNS**: Implementación de un mecanismo de publicación/suscripción para desacoplar microservicios y facilitar notificaciones (ej. emails).
    *   **AWS CloudWatch**: Instrumentación y envío de métricas personalizadas para monitoreo de rendimiento y estado de la aplicación.
    *   **AWS API Gateway**: Manejo de eventos HTTP, enrutamiento y configuración de CORS.
*   **Generación de Documentos**: Creación dinámica de PDFs con `pdfkit` para reportes o documentos transaccionales.
*   **Validación de Datos y Manejo de Errores**: Implementación de lógica de validación robusta y respuestas de error estandarizadas.
*   **Contenerización con Docker**: Creación de Dockerfiles multi-stage para builds optimizados y despliegues consistentes.
*   **Gestión de Proyectos TypeScript**: Configuración de `tsconfig.json`, gestión de dependencias y scripts de compilación.
*   **Optimización de Rendimiento**: Publicación asíncrona de métricas para evitar latencia adicional en la respuesta de la API.