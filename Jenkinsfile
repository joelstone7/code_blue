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