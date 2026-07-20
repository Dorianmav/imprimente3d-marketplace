<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 px-4 py-10">
        <div class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
            <div class="w-full rounded-3xl border border-white/70 bg-white/80 p-8 shadow-2xl shadow-blue-100/40 backdrop-blur md:p-12">
                <div class="mx-auto max-w-2xl text-center">
                    <p class="mb-4 inline-flex rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-700">
                        Imprimente3D Marketplace
                    </p>
                    <h1 class="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
                        Trouve, compare et démarre ton projet 3D plus vite.
                    </h1>
                    <p class="mx-auto mt-6 max-w-xl text-base leading-7 text-gray-600 md:text-lg">
                        Découvre des produits, gère tes commandes et accède à ton espace en quelques clics.
                    </p>

                    <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <NuxtLink
                            to="/signup"
                            class="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-600/30"
                        >
                            Creer un compte
                        </NuxtLink>
                        <NuxtLink
                            to="/login"
                            class="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition duration-200 hover:border-gray-400 hover:bg-gray-50"
                        >
                            Accéder à mon compte
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>