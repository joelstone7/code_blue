pipeline {
    agent any

    stages {
        stage('Instalar dependencias') {
            steps {
                dir('backend') {
                    bat 'npm install'
                }
            }
        }

        stage('Ejecutar pruebas') {
            steps {
                dir('backend') {
                    bat 'npm test -- --watchAll=false'
                }
            }
        }

        stage('Publicar reporte') {
            steps {
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'backend/reports',
                    reportFiles: 'test-report.html',
                    reportName: 'Reporte de Pruebas Jest'
                ])
            }
        }
    }

    post {
        success {
            echo '✅ Todas las pruebas pasaron correctamente'
        }
        failure {
            echo '❌ Algunas pruebas fallaron'
        }
    }
}